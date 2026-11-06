package com.selfforge.discipline.payment;

import com.selfforge.discipline.DisciplineApiApplication;
import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.auth.PremiumTier;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DisciplineApiApplication.class, properties = {
        "spring.datasource.url=jdbc:h2:mem:payment-orders;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "app.payment.order-expiry-seconds=1800",
        "app.payment.orders-enabled=true",
        "app.payment.sepay.webhook-enabled=true",
        "app.payment.sepay.webhook-key=test-sepay-key",
        "app.payment.sepay.recipient-account=0012345",
        "app.login-attempt-limit.global-limit=1000",
        "app.login-attempt-limit.per-client-limit=1000"
})
@ActiveProfiles("test")
@Import(PaymentOrderServiceTests.FixedTime.class)
@AutoConfigureMockMvc
class PaymentOrderServiceTests {
    private static final Instant NOW = Instant.parse("2026-11-05T06:00:00Z");

    @TestConfiguration
    static class FixedTime {
        @Bean @Primary Clock paymentClock() { return Clock.fixed(NOW, ZoneOffset.UTC); }
    }

    @Autowired PaymentOrderService payments;
    @Autowired PaymentOrderRepository orders;
    @Autowired AppUserRepository users;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @Test void authenticatedTransactionUsesTheServerCatalogAndReplayCannotExtendPremium() {
        AppUser user = user();
        PaymentOrder order = payments.create(user, PaymentPlan.MONTHLY);
        assertEquals(49_000L, order.getAmountVnd());
        assertEquals("VND", order.getCurrency());
        assertEquals(PaymentOrderStatus.PENDING, order.getStatus());
        assertTrue(order.getReference().matches("SFG[A-Z2-9]{16}"));
        assertEquals(NOW.plusSeconds(1800), order.getExpiresAt());

        var accepted = payments.recordVerifiedTransaction(new PaymentOrderService.ProviderTransaction(
                "SEPAY", "transaction-101", order.getReference(), 49_000L, true));
        assertEquals(PaymentEventDisposition.ACCEPTED, accepted.disposition());
        assertFalse(accepted.duplicate());
        assertEquals(PaymentOrderStatus.PAID, accepted.order().getStatus());
        assertEquals(NOW, accepted.order().getPaidAt());
        assertEquals(NOW.atZone(ZoneOffset.UTC).plusMonths(1).toInstant(), accepted.order().getEntitlementExpiresAt());

        AppUser credited = users.findById(user.getId()).orElseThrow();
        assertEquals(PremiumTier.PREMIUM, credited.getPremiumTier());
        assertEquals(NOW.atZone(ZoneOffset.UTC).plusMonths(1).toInstant(), credited.getPremiumExpiresAt());

        var replay = payments.recordVerifiedTransaction(new PaymentOrderService.ProviderTransaction(
                "SEPAY", "transaction-101", order.getReference(), 49_000L, true));
        assertTrue(replay.duplicate());
        assertEquals(PaymentEventDisposition.ACCEPTED, replay.disposition());
        assertEquals(NOW.atZone(ZoneOffset.UTC).plusMonths(1).toInstant(), users.findById(user.getId()).orElseThrow().getPremiumExpiresAt());
    }

    @Test void wrongAmountIsReviewedWithoutChangingTheUsersEntitlement() {
        AppUser user = user();
        PaymentOrder order = payments.create(user, PaymentPlan.YEARLY);

        var result = payments.recordVerifiedTransaction(new PaymentOrderService.ProviderTransaction(
                "SEPAY", "transaction-amount-mismatch", order.getReference(), 1L, true));

        assertEquals(PaymentEventDisposition.REVIEW, result.disposition());
        assertFalse(result.duplicate());
        assertEquals(PaymentOrderStatus.REVIEW, result.order().getStatus());
        assertEquals(PaymentReviewReason.AMOUNT_MISMATCH, result.event().getReviewReason());
        AppUser unchanged = users.findById(user.getId()).orElseThrow();
        assertEquals(PremiumTier.FREE, unchanged.getPremiumTier());
        assertNull(unchanged.getPremiumExpiresAt());
    }

    @Test void retryReusesAnActivePlanButAnExplicitPlanChangeCancelsTheOldReference() {
        AppUser user = user();
        PaymentOrder monthly = payments.create(user, PaymentPlan.MONTHLY);
        PaymentOrder retry = payments.create(user, PaymentPlan.MONTHLY);
        assertEquals(monthly.getId(), retry.getId());
        assertEquals(monthly.getReference(), retry.getReference());

        PaymentOrder yearly = payments.create(user, PaymentPlan.YEARLY);
        assertNotEquals(monthly.getReference(), yearly.getReference());
        assertEquals(PaymentOrderStatus.CANCELLED, orders.findById(monthly.getId()).orElseThrow().getStatus());
        assertEquals(PaymentOrderStatus.PENDING, yearly.getStatus());

        var lateTransfer = payments.recordVerifiedTransaction(new PaymentOrderService.ProviderTransaction(
                "SEPAY", "transaction-cancelled-order", monthly.getReference(), 49_000L, true));
        assertEquals(PaymentEventDisposition.REVIEW, lateTransfer.disposition());
        assertEquals(PaymentOrderStatus.CANCELLED, orders.findById(monthly.getId()).orElseThrow().getStatus());
        assertEquals(PremiumTier.FREE, users.findById(user.getId()).orElseThrow().getPremiumTier());
    }

    @Test void lifetimeOrderGrantsLifetimeOnlyOnce() {
        AppUser user = user();
        PaymentOrder order = payments.create(user, PaymentPlan.LIFETIME);
        var result = payments.recordVerifiedTransaction(new PaymentOrderService.ProviderTransaction(
                "SEPAY", "transaction-lifetime", order.getReference(), 999_000L, true));

        assertEquals(PaymentEventDisposition.ACCEPTED, result.disposition());
        AppUser credited = users.findById(user.getId()).orElseThrow();
        assertEquals(PremiumTier.LIFETIME, credited.getPremiumTier());
        assertNull(credited.getPremiumExpiresAt());
        assertNull(result.order().getEntitlementExpiresAt());
    }

    @Test void authenticatedOrderAndVerifiedWebhookRefreshTheEntitlementExactlyOnce() throws Exception {
        Registration registration = register();
        String token = registration.token();
        String body = mvc.perform(post("/api/payments/orders").header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON).content("{\"plan\":\"MONTHLY\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amountVnd").value(49000))
                .andExpect(jsonPath("$.currency").value("VND"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        String reference = json.readTree(body).get("reference").asText();

        String webhook = json.writeValueAsString(Map.of("id", 9001, "accountNumber", "0012345",
                "transferType", "in", "transferAmount", 49000, "content", "Premium " + reference));
        mvc.perform(post("/api/payments/sepay/webhook").contentType(APPLICATION_JSON).content(webhook))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/payments/sepay/webhook").header("Authorization", "Apikey wrong")
                        .contentType(APPLICATION_JSON).content(webhook))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/payments/sepay/webhook").header("Authorization", "Apikey test-sepay-key")
                        .contentType(APPLICATION_JSON).content(webhook))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));

        mvc.perform(get("/api/payments/orders/{reference}", reference).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAID"));
        mvc.perform(get("/api/premium/status").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isPremium").value(true));

        mvc.perform(post("/api/payments/sepay/webhook").header("Authorization", "Apikey test-sepay-key")
                        .contentType(APPLICATION_JSON).content(webhook))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        mvc.perform(get("/api/payments/orders/{reference}", reference).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.entitlementExpiresAt").value("2026-12-05T06:00:00Z"));
    }

    @Test void accountDeletionRemovesPaymentOrdersButKeepsDeidentifiedEventForReconciliation() throws Exception {
        Registration registration = register();
        String created = mvc.perform(post("/api/payments/orders").header("Authorization", "Bearer " + registration.token())
                        .contentType(APPLICATION_JSON).content("{\"plan\":\"MONTHLY\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String reference = json.readTree(created).get("reference").asText();
        String webhook = json.writeValueAsString(Map.of("id", 9002, "accountNumber", "0012345",
                "transferType", "in", "transferAmount", 49000, "content", reference));
        mvc.perform(post("/api/payments/sepay/webhook").header("Authorization", "Apikey test-sepay-key")
                        .contentType(APPLICATION_JSON).content(webhook))
                .andExpect(status().isOk());

        mvc.perform(delete("/api/profile/account").header("Authorization", "Bearer " + registration.token())
                        .contentType(APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                "currentPassword", "password123", "confirmationEmail", registration.email()))))
                .andExpect(status().isNoContent());

        assertEquals(0, jdbc.queryForObject("select count(*) from app_user where email = ?", Integer.class, registration.email()));
        assertEquals(0, jdbc.queryForObject("select count(*) from payment_order where reference = ?", Integer.class, reference));
        assertEquals(1, jdbc.queryForObject("select count(*) from payment_event where provider = 'SEPAY' and external_id = '9002' and payment_order_id is null", Integer.class));
    }

    private AppUser user() {
        return users.saveAndFlush(new AppUser(UUID.randomUUID() + "@example.test", "Payment test", "unused"));
    }

    private record Registration(String email, String token) { }

    private Registration register() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        String response = mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "displayName", "Payment HTTP",
                                "password", "password123", "termsAccepted", true))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new Registration(email, json.readTree(response).get("token").asText());
    }
}
