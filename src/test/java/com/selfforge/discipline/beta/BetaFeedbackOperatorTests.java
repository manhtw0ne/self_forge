package com.selfforge.discipline.beta;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Ensures beta operators can triage only deliberately submitted feedback. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:beta-feedback-operator;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.beta-metrics.key=beta-feedback-operator-key",
        "app.login-attempt-limit.per-client-limit=1000",
        "app.login-attempt-limit.global-limit=1000"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class BetaFeedbackOperatorTests {
    private static final String OPERATOR_KEY = "beta-feedback-operator-key";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void operatorCanTriageSubmittedFeedbackWithoutExposingAccountIdentityOrInternalNotesToUser() throws Exception {
        String token = register();
        JsonNode created = json.readTree(mvc.perform(post("/api/feedback")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "type", "BUG", "summary", "The focus timer stops after backgrounding.",
                                "steps", "Start a timer, background the app, return after five minutes.",
                                "expected", "The elapsed time should be preserved.", "language", "en"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        long id = created.get("id").asLong();

        mvc.perform(get("/api/operator/beta-feedback"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/operator/beta-feedback").header("X-SelfForge-Operator-Key", OPERATOR_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].status").value("NEW"))
                .andExpect(jsonPath("$[0].summary").value("The focus timer stops after backgrounding."))
                .andExpect(jsonPath("$[0].userId").doesNotExist())
                .andExpect(jsonPath("$[0].email").doesNotExist());

        mvc.perform(patch("/api/operator/beta-feedback/{id}", id)
                        .header("X-SelfForge-Operator-Key", OPERATOR_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PLANNED\",\"note\":\"Reproduced on Android; schedule for next patch.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLANNED"))
                .andExpect(jsonPath("$.note").value("Reproduced on Android; schedule for next patch."))
                .andExpect(jsonPath("$.reviewedAt").isNotEmpty());

        mvc.perform(get("/api/operator/beta-feedback")
                        .header("X-SelfForge-Operator-Key", OPERATOR_KEY)
                        .param("status", "NEW"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/operator/beta-feedback")
                        .header("X-SelfForge-Operator-Key", OPERATOR_KEY)
                        .param("status", "PLANNED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id));

        mvc.perform(get("/api/feedback").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].status").doesNotExist())
                .andExpect(jsonPath("$[0].note").doesNotExist())
                .andExpect(jsonPath("$[0].reviewedAt").doesNotExist());

        mvc.perform(delete("/api/feedback/{id}", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/operator/beta-feedback").header("X-SelfForge-Operator-Key", OPERATOR_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    private String register() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String body = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "email", email, "displayName", "Feedback tester",
                                "password", "password123", "termsAccepted", true))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }
}
