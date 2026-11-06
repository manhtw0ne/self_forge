package com.selfforge.discipline.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.DisciplineApiApplication;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Proves the payment provider is fail-closed until a merchant enables it deliberately. */
@SpringBootTest(classes = DisciplineApiApplication.class, properties = {
        "spring.datasource.url=jdbc:h2:mem:payment-disabled;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class PaymentFeatureDisabledTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test void defaultConfigurationHidesWebhookAndDoesNotOfferOrders() throws Exception {
        String webhook = json.writeValueAsString(Map.of("id", 1, "accountNumber", "0012345",
                "transferType", "in", "transferAmount", 49000, "content", "SFGAAAAAAAAAAAAAAAA"));
        mvc.perform(post("/api/payments/sepay/webhook").header("Authorization", "Apikey ignored")
                        .contentType(APPLICATION_JSON).content(webhook))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/operator/payments/review"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/payments/orders").contentType(APPLICATION_JSON).content("{\"plan\":\"MONTHLY\"}"))
                .andExpect(status().isUnauthorized());

        String email = UUID.randomUUID() + "@example.test";
        String registration = mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "displayName", "Disabled payment",
                                "password", "password123", "termsAccepted", true))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(registration).get("token").asText();
        mvc.perform(post("/api/payments/orders").header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON).content("{\"plan\":\"MONTHLY\"}"))
                .andExpect(status().isServiceUnavailable());
    }
}
