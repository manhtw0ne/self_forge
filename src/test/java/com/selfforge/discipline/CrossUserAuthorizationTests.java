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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * A3 — Cross-user isolation tests.
 *
 * Verifies that users cannot read, modify or delete resources that belong to other users.
 * Each test registers two independent accounts, creates resources under the first,
 * and asserts that the second account receives 403/404 (not 200 or 500) on all
 * read/write/delete operations against those resources.
 *
 * Policy: We return 404 (not 403) for most owned resources to avoid leaking
 * existence information to unauthorized callers. Both are acceptable here.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:crossuser;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class CrossUserAuthorizationTests {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired com.selfforge.discipline.auth.AppUserRepository users;

    private String register(String email) throws Exception {
        var response = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "email", email, "displayName", "Tester",
                        "password", "password123", "termsAccepted", true))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("token").asText();
    }

    private long createHabit(String token) throws Exception {
        var body = mvc.perform(post("/api/habits").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Read\",\"difficulty\":\"MEDIUM\",\"targetPerWeek\":5}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private long createGoal(String token) throws Exception {
        var user = users.findByEmail(json.readTree(
                mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                        .andReturn().getResponse().getContentAsString()).get("email").asText()).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        var body = mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Goal\",\"targetValue\":10,\"unit\":\"books\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private long createReward(String token) throws Exception {
        // Custom rewards require premium — activate it first
        var email = json.readTree(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString()).get("email").asText();
        var u = users.findByEmail(email).orElseThrow();
        u.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(u);
        var body = mvc.perform(post("/api/custom-rewards").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Coffee\",\"xpCost\":100}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private long createReminder(String token, long habitId) throws Exception {
        var body = mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "habitId", habitId,
                        "reminderTime", "08:00",
                        "daysOfWeek", "MON,TUE"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private long createChallenge(String token, long habitId) throws Exception {
        var today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        var body = mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "habitId", habitId, "name", "Test challenge",
                        "targetDays", 7, "startDate", today.toString()))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    // ── Habits ───────────────────────────────────────────────────────────────

    @Test void cannotModifyOrDeleteAnotherUsersHabit() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String intruder = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(owner);

        // Read list — should be empty for intruder, not leak owner's habits
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + intruder))
                .andExpect(status().isOk()).andExpect(content().json("[]"));

        // Attempt to edit foreign habit
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Hijacked\"}"))
                .andExpect(status().isNotFound());

        // Attempt to delete foreign habit
        mvc.perform(delete("/api/habits/" + habit).header("Authorization", "Bearer " + intruder))
                .andExpect(status().isNotFound());

        // Attempt to check-in to foreign habit
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "habitId", habit, "status", "COMPLETED"))))
                .andExpect(status().isNotFound());
    }

    // ── Goals ────────────────────────────────────────────────────────────────

    @Test void cannotReadOrModifyAnotherUsersGoal() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String intruder = register(UUID.randomUUID() + "@example.com");
        // Make intruder premium too so access is not blocked by quota
        var intruderUser = users.findByEmail(json.readTree(
                mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + intruder))
                        .andReturn().getResponse().getContentAsString()).get("email").asText()).orElseThrow();
        intruderUser.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(intruderUser);

        long goal = createGoal(owner);

        // Goal list for intruder must be empty
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + intruder))
                .andExpect(status().isOk()).andExpect(content().json("[]"));

        // Progress update on foreign goal must fail
        mvc.perform(post("/api/goals/" + goal + "/progress")
                .header("Authorization", "Bearer " + intruder)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":5}"))
                .andExpect(status().isNotFound());

        // Abandon foreign goal must fail
        mvc.perform(post("/api/goals/" + goal + "/abandon")
                .header("Authorization", "Bearer " + intruder))
                .andExpect(status().isNotFound());
    }

    // ── Reminders ────────────────────────────────────────────────────────────

    @Test void cannotReadOrModifyAnotherUsersReminder() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String intruder = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(owner);
        long reminder = createReminder(owner, habit);

        // Reminder list for intruder must be empty
        mvc.perform(get("/api/reminders").header("Authorization", "Bearer " + intruder))
                .andExpect(status().isOk()).andExpect(content().json("[]"));

        // Patch reminder
        mvc.perform(patch("/api/reminders/" + reminder)
                .header("Authorization", "Bearer " + intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"time\":\"09:00\"}"))
                .andExpect(status().isNotFound());

        // Delete reminder
        mvc.perform(delete("/api/reminders/" + reminder)
                .header("Authorization", "Bearer " + intruder))
                .andExpect(status().isNotFound());
    }

    // ── Custom Rewards ────────────────────────────────────────────────────────

    @Test void cannotClaimOrDeleteAnotherUsersReward() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String intruder = register(UUID.randomUUID() + "@example.com");
        long reward = createReward(owner);

        // Make intruder premium so premium gate doesn't block isolation test
        var intruderEmail = json.readTree(mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + intruder))
                .andReturn().getResponse().getContentAsString()).get("email").asText();
        var intruderUser = users.findByEmail(intruderEmail).orElseThrow();
        intruderUser.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(intruderUser);

        // Reward list for intruder must be empty (not leak owner's rewards)
        mvc.perform(get("/api/custom-rewards").header("Authorization", "Bearer " + intruder))
                .andExpect(status().isOk()).andExpect(content().json("[]"));

        // Claim foreign reward must fail
        mvc.perform(post("/api/custom-rewards/" + reward + "/claim")
                .header("Authorization", "Bearer " + intruder))
                .andExpect(status().isNotFound());

        // Delete foreign reward must fail
        mvc.perform(delete("/api/custom-rewards/" + reward)
                .header("Authorization", "Bearer " + intruder))
                .andExpect(status().isNotFound());
    }

    // ── Challenges ────────────────────────────────────────────────────────────

    @Test void cannotReadOrModifyAnotherUsersChallenge() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String intruder = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(owner);
        long challenge = createChallenge(owner, habit);

        // Challenge list for intruder must be empty
        mvc.perform(get("/api/challenges").header("Authorization", "Bearer " + intruder))
                .andExpect(status().isOk()).andExpect(content().json("[]"));

        // Progress on foreign challenge
        mvc.perform(get("/api/challenges/" + challenge + "/progress")
                .header("Authorization", "Bearer " + intruder))
                .andExpect(status().isNotFound());

        // Abandon foreign challenge
        mvc.perform(patch("/api/challenges/" + challenge + "/status")
                .header("Authorization", "Bearer " + intruder)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ABANDONED\"}"))
                .andExpect(status().isNotFound());
    }

    // ── Check-in history ──────────────────────────────────────────────────────

    @Test void checkInHistoryOnlyReturnsOwnData() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String intruder = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(owner);
        // Owner checks in today
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "status", "COMPLETED"))))
                .andExpect(status().isCreated());

        // Intruder's check-in list must be empty (array, not owner's data)
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + intruder))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    // ── Streak freeze ─────────────────────────────────────────────────────────

    @Test void cannotFreezeAnotherUsersHabitStreak() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String intruder = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(owner);

        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit))))
                .andExpect(status().isNotFound());
    }

    // ── Export ────────────────────────────────────────────────────────────────

    @Test void exportOnlyContainsOwnData() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String intruder = register(UUID.randomUUID() + "@example.com");

        // Make both premium
        for (String token : new String[]{owner, intruder}) {
            var email = json.readTree(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                    .andReturn().getResponse().getContentAsString()).get("email").asText();
            var u = users.findByEmail(email).orElseThrow();
            u.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
            users.save(u);
        }

        // Owner creates a habit with a distinctive name
        mvc.perform(post("/api/habits").header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"OWNER_ONLY_HABIT_X9Z\",\"difficulty\":\"MEDIUM\",\"targetPerWeek\":5}"))
                .andExpect(status().isCreated());

        // Intruder exports — must not contain owner's habit
        String csv = mvc.perform(get("/api/export/csv").header("Authorization", "Bearer " + intruder))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(
                csv.contains("OWNER_ONLY_HABIT_X9Z"),
                "Export must not leak another user's habits");
    }

    // ── Unauthenticated access ────────────────────────────────────────────────

    @Test void unauthenticatedRequestsAreRejectedOnAllOwnerEndpoints() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(owner);

        // All these must return 401
        mvc.perform(get("/api/habits")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/check-ins")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/check-ins/history")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/goals")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/reminders")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/custom-rewards")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/challenges")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/profile")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/export/csv")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/streak-freeze/remaining")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/check-ins").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "status", "COMPLETED"))))
                .andExpect(status().isUnauthorized());
    }
}
