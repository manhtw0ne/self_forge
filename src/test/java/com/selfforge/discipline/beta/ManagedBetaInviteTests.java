package com.selfforge.discipline.beta;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Covers a per-person closed beta without retaining or listing plaintext codes. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:managed-beta-invites;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.registration.managed-invites-enabled=true",
        "app.beta-metrics.key=managed-invite-operator-key",
        "app.login-attempt-limit.per-client-limit=1000",
        "app.login-attempt-limit.global-limit=1000"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ManagedBetaInviteTests {
    private static final String OPERATOR_KEY = "managed-invite-operator-key";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void operatorCanIssueBoundedInviteWithoutLeakingItAndRevokeAnotherInvite() throws Exception {
        mvc.perform(get("/api/auth/registration/availability"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inviteRequired").value(true))
                .andExpect(jsonPath("$.inviteCode").doesNotExist());

        mvc.perform(post("/api/operator/beta-invites")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("label", "First beta wave", "maxUses", 2))))
                .andExpect(status().isNotFound());

        JsonNode issued = json.readTree(mvc.perform(post("/api/operator/beta-invites")
                        .header("X-SelfForge-Operator-Key", OPERATOR_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("label", "First beta wave", "maxUses", 2))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").isNotEmpty())
                .andExpect(jsonPath("$.useCount").value(0))
                .andReturn().getResponse().getContentAsString());
        String firstCode = issued.get("code").asText();
        long firstId = issued.get("id").asLong();
        assertNotNull(firstCode);

        mvc.perform(get("/api/operator/beta-invites").header("X-SelfForge-Operator-Key", OPERATOR_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(firstId))
                .andExpect(jsonPath("$[0].label").value("First beta wave"))
                .andExpect(jsonPath("$[0].code").doesNotExist())
                .andExpect(jsonPath("$[0].codeHash").doesNotExist());

        register(UUID.randomUUID() + "@example.com", null).andExpect(status().isForbidden());
        register(UUID.randomUUID() + "@example.com", firstCode).andExpect(status().isCreated());
        register(UUID.randomUUID() + "@example.com", firstCode).andExpect(status().isCreated());
        register(UUID.randomUUID() + "@example.com", firstCode).andExpect(status().isForbidden());

        mvc.perform(get("/api/operator/beta-invites").header("X-SelfForge-Operator-Key", OPERATOR_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(firstId))
                .andExpect(jsonPath("$[0].useCount").value(2));

        JsonNode revocable = json.readTree(mvc.perform(post("/api/operator/beta-invites")
                        .header("X-SelfForge-Operator-Key", OPERATOR_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("label", "Can revoke"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        long revocableId = revocable.get("id").asLong();
        String revocableCode = revocable.get("code").asText();

        mvc.perform(delete("/api/operator/beta-invites/{id}", revocableId)
                        .header("X-SelfForge-Operator-Key", OPERATOR_KEY))
                .andExpect(status().isNoContent());
        register(UUID.randomUUID() + "@example.com", revocableCode).andExpect(status().isForbidden());
    }

    private org.springframework.test.web.servlet.ResultActions register(String email, String inviteCode) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("displayName", "Managed beta tester");
        payload.put("password", "password123");
        payload.put("termsAccepted", true);
        if (inviteCode != null) payload.put("inviteCode", inviteCode);
        return mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)));
    }
}
