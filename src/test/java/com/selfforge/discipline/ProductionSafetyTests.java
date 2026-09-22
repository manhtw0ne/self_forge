package com.selfforge.discipline;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.util.Map;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:safety;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ProductionSafetyTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired com.selfforge.discipline.auth.AppUserRepository users;
    @Autowired com.selfforge.discipline.reward.RewardService rewards;

    @Test void rewardClaimPersistsAndCannotBeRepeated() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        rewards.addXp(user, 100);
        mvc.perform(post("/api/custom-rewards").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Invalid\",\"xpCost\":-1}"))
                .andExpect(status().isBadRequest());
        String body = mvc.perform(post("/api/custom-rewards").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Break\",\"xpCost\":30}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(post("/api/custom-rewards/" + id + "/claim").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.claimed").value(true));
        mvc.perform(post("/api/custom-rewards/" + id + "/claim").header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(70, rewards.getUserProgress(user).totalXp());
    }

    private String register(String email) throws Exception {
        var response = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "displayName", "Tester", "password", "password123"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("token").asText();
    }

    @Test void profilePersistsAndPasswordChangeRevokesAllSessions() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        String otherSession = json.readTree(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "password123"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
        mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"Updated\",\"timezone\":\"Asia/Bangkok\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/profile").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.displayName").value("Updated"));
        mvc.perform(patch("/api/profile/password").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"oldPassword\":\"password123\",\"newPassword\":\"changed123\"}"))
                .andExpect(status().isOk());
        for (String session : new String[]{token, otherSession}) {
            mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + session)).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "password123"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "changed123"))))
                .andExpect(status().isOk());
    }

    @Test void logoutRevokesTokenAndIsIdempotent() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        }
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    @Test void cannotSelfGrantPremium() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        mvc.perform(post("/api/premium/activate").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"tier\":\"LIFETIME\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/premium/status").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.isPremium").value(false));
    }

    @Test void rejectsMissingPasswordAndInvalidProfileInputs() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"missing@example.com\",\"displayName\":\"Tester\"}"))
                .andExpect(status().isBadRequest());
        String token = register(UUID.randomUUID() + "@example.com");
        mvc.perform(patch("/api/profile/password").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"oldPassword\":\"password123\",\"newPassword\":\"x\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"timezone\":\"invalid/zone\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void usersCannotReadEachOthersHabits() throws Exception {
        String first = register(UUID.randomUUID() + "@example.com");
        String second = register(UUID.randomUUID() + "@example.com");
        mvc.perform(post("/api/habits").header("Authorization", "Bearer " + first)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Private habit\",\"difficulty\":\"MEDIUM\",\"targetPerWeek\":5}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + second))
                .andExpect(status().isOk()).andExpect(content().json("[]"))
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test void healthDoesNotExposeDatabaseDetails() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(content().json("{\"status\":\"UP\"}"));
    }

    @Test void goalProgressAndWeeklyReviewUpdatesPersistAcrossRequests() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        String response = mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Read books\",\"targetValue\":10,\"unit\":\"books\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(response).get("id").asLong();
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":2}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].currentValue").value(2));
        for (String wins : new String[]{"First", "Updated"}) {
            mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("wins", wins, "rating", 4))))
                    .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/weekly-review/current").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.wins").value("Updated"));
    }
}
