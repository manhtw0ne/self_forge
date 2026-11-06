package com.selfforge.discipline.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Payment review metadata is operator-only and cannot alter an entitlement. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:payment-operator;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "app.payment.orders-enabled=true",
        "app.payment.operator-key=payment-operator-key",
        "app.payment.sepay.webhook-enabled=true",
        "app.payment.sepay.webhook-key=test-sepay-key",
        "app.payment.sepay.recipient-account=0012345",
        "app.login-attempt-limit.global-limit=1000",
        "app.login-attempt-limit.per-client-limit=1000"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class PaymentOperatorTests {
    private static final String OPERATOR_KEY = "payment-operator-key";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test void reviewQueueNeedsItsOwnKeyAndDoesNotExposeAccountIdentity() throws Exception {
        String token = register();
        JsonNode order = json.readTree(mvc.perform(post("/api/payments/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"plan\":\"MONTHLY\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String reference = order.get("reference").asText();
        String webhook = json.writeValueAsString(Map.of("id", 9101, "accountNumber", "0012345",
                "transferType", "in", "transferAmount", 1, "content", reference));
        mvc.perform(post("/api/payments/sepay/webhook").header("Authorization", "Apikey test-sepay-key")
                        .contentType(MediaType.APPLICATION_JSON).content(webhook))
                .andExpect(status().isOk());

        mvc.perform(get("/api/operator/payments/review"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/operator/payments/review")
                        .header("X-SelfForge-Payment-Operator-Key", "wrong"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/operator/payments/review")
                        .header("X-SelfForge-Payment-Operator-Key", OPERATOR_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].provider").value("SEPAY"))
                .andExpect(jsonPath("$[0].externalId").value("9101"))
                .andExpect(jsonPath("$[0].reference").value(reference))
                .andExpect(jsonPath("$[0].amountVnd").value(1))
                .andExpect(jsonPath("$[0].reviewReason").value("AMOUNT_MISMATCH"))
                .andExpect(jsonPath("$[0].expectedAmountVnd").value(49000))
                .andExpect(jsonPath("$[0].plan").value("MONTHLY"))
                .andExpect(jsonPath("$[0].orderStatus").value("REVIEW"))
                .andExpect(jsonPath("$[0].userId").doesNotExist())
                .andExpect(jsonPath("$[0].email").doesNotExist())
                .andExpect(jsonPath("$[0].accountNumber").doesNotExist())
                .andExpect(jsonPath("$[0].content").doesNotExist());
    }

    private String register() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "displayName", "Payment operator",
                                "password", "password123", "termsAccepted", true))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }
}
