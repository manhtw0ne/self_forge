package com.selfforge.discipline.auth;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** A closed beta must reject uninvited sign-ups without exposing its configured code. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:beta-invite;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.registration.invite-code=correct-horse-battery-staple"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class BetaInviteRegistrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired AuthService auth;
    @Autowired OAuthLoginService oauth;

    @Test void inviteRequirementIsAdvertisedWithoutLeakingItsValueAndEnforced() throws Exception {
        mvc.perform(get("/api/auth/registration/availability"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inviteRequired").value(true))
                .andExpect(jsonPath("$.inviteCode").doesNotExist());

        String withoutInvite = UUID.randomUUID() + "@example.com";
        register(withoutInvite, null).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("SelfForge beta hiện yêu cầu mã mời."));
        register(UUID.randomUUID() + "@example.com", "incorrect-code").andExpect(status().isForbidden());
        org.junit.jupiter.api.Assertions.assertFalse(users.existsByEmail(withoutInvite));

        register(UUID.randomUUID() + "@example.com", "correct-horse-battery-staple")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty());

        org.junit.jupiter.api.Assertions.assertThrows(AuthService.BetaInviteRequired.class,
                () -> auth.authenticateWithOAuth(OAuthProvider.GOOGLE, "closed-beta-subject",
                        UUID.randomUUID() + "@example.com", "Uninvited", true));
        org.junit.jupiter.api.Assertions.assertFalse(oauth.availability().google());
        org.junit.jupiter.api.Assertions.assertFalse(oauth.availability().facebook());
    }

    private org.springframework.test.web.servlet.ResultActions register(String email, String inviteCode) throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("displayName", "Beta tester");
        payload.put("password", "password123");
        payload.put("termsAccepted", true);
        if (inviteCode != null) payload.put("inviteCode", inviteCode);
        return mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)));
    }
}
