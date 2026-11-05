package com.selfforge.discipline;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The smallest complete, free user journey. This protects the path a new beta
 * user needs without granting Premium or relying on email/OAuth/payment setup.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:first-user-journey;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.login-attempt-limit.global-limit=1000"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class FirstUserJourneyTests {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void newFreeUserCanCompleteTheCoreOnboardingJourney() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String registration = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "email", email,
                                "displayName", "First user",
                                "password", "password123",
                                "termsAccepted", true
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.isPremium").value(false))
                .andExpect(jsonPath("$.user.termsAcceptedAt").exists())
                .andReturn().getResponse().getContentAsString();
        String token = json.readTree(registration).get("token").asText();
        String authorization = "Bearer " + token;

        mvc.perform(get("/api/getting-started").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeHabit").value(false))
                .andExpect(jsonPath("$.completedCheckIn").value(false))
                .andExpect(jsonPath("$.journalEntry").value(false));

        String habit = mvc.perform(post("/api/habits").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Walk for five minutes\",\"difficulty\":\"EASY\",\"targetPerWeek\":3,\"scheduledDays\":\"MON,WED,FRI\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Walk for five minutes"))
                .andReturn().getResponse().getContentAsString();
        long habitId = json.readTree(habit).get("id").asLong();

        mvc.perform(get("/api/dashboard/today").header("Authorization", authorization).param("date", "2026-11-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.habits[0].scheduledToday").value(true));
        mvc.perform(get("/api/dashboard/today").header("Authorization", authorization).param("date", "2026-11-03"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.habits[0].scheduledToday").value(false));

        String dashboard = mvc.perform(get("/api/dashboard/today").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeHabitCount").value(1))
                .andExpect(jsonPath("$.habits[0].habitId").value(habitId))
                .andExpect(jsonPath("$.habits[0].scheduledToday").isBoolean())
                .andExpect(jsonPath("$.habits[0].recordedSetbacksThisWeek").value(0))
                .andExpect(jsonPath("$.habits[0].todayStatus").isEmpty())
                .andReturn().getResponse().getContentAsString();
        String today = json.readTree(dashboard).get("date").asText();

        mvc.perform(post("/api/check-ins/new").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "habitId", habitId,
                                "date", today,
                                "status", "COMPLETED",
                                "note", "A small first step"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.habitId").value(habitId))
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mvc.perform(post("/api/journal").header("Authorization", authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "date", today,
                                "win", "I followed through today."
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.date").value(today));

        mvc.perform(get("/api/dashboard/today").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.habits[0].todayStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.todayScore").value(5));
        mvc.perform(get("/api/getting-started").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeHabit").value(true))
                .andExpect(jsonPath("$.completedCheckIn").value(true))
                .andExpect(jsonPath("$.journalEntry").value(true));
    }
}
