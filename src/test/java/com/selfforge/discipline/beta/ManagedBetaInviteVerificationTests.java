package com.selfforge.discipline.beta;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.auth.PasswordResetMail;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** A mistyped registration OTP must not consume a bounded beta invite. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:managed-beta-otp;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.registration.managed-invites-enabled=true",
        "app.registration.require-email-verification=true",
        "app.beta-metrics.key=managed-invite-otp-operator-key",
        "app.login-attempt-limit.per-client-limit=1000",
        "app.login-attempt-limit.global-limit=1000",
        "app.email-request-limit.per-client-limit=1000"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ManagedBetaInviteVerificationTests {
    private static final String OPERATOR_KEY = "managed-invite-otp-operator-key";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean PasswordResetMail mail;
    private final Map<String, String> inbox = new ConcurrentHashMap<>();

    @BeforeEach
    void setUpMail() throws Exception {
        when(mail.available()).thenReturn(true);
        doAnswer(call -> { inbox.put(call.getArgument(0), call.getArgument(1)); return null; })
                .when(mail).sendRegistration(anyString(), anyString());
    }

    @Test
    void rejectedOtpLeavesTheInviteAvailableForTheSameVerifiedRegistration() throws Exception {
        JsonNode issued = json.readTree(mvc.perform(post("/api/operator/beta-invites")
                        .header("X-SelfForge-Operator-Key", OPERATOR_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("label", "OTP-safe", "maxUses", 1))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String inviteCode = issued.get("code").asText();
        long inviteId = issued.get("id").asLong();
        String email = UUID.randomUUID() + "@example.com";

        mvc.perform(post("/api/auth/registration/request").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isAccepted());
        String otp = inbox.get(email);

        register(email, "000000", inviteCode).andExpect(status().isBadRequest());
        mvc.perform(get("/api/operator/beta-invites").header("X-SelfForge-Operator-Key", OPERATOR_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(inviteId))
                .andExpect(jsonPath("$[0].useCount").value(0));

        register(email, otp, inviteCode).andExpect(status().isCreated());
        mvc.perform(get("/api/operator/beta-invites").header("X-SelfForge-Operator-Key", OPERATOR_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].useCount").value(1));
    }

    private org.springframework.test.web.servlet.ResultActions register(String email, String otp, String inviteCode) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("displayName", "OTP beta tester");
        payload.put("password", "password123");
        payload.put("termsAccepted", true);
        payload.put("code", otp);
        payload.put("inviteCode", inviteCode);
        return mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)));
    }
}
