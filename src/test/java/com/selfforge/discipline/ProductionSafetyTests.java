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
import java.util.List;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:safety;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        // This suite creates more than the production-wide 120 registrations per minute.
        // Keep the per-email limit intact; isolate its independent resource tests from shared guards.
        "app.login-attempt-limit.global-limit=1000",
        "app.login-attempt-limit.per-client-limit=1000"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ProductionSafetyTests {
    @Autowired com.selfforge.discipline.pomodoro.PomodoroRepository focusSearchFixtures;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired com.selfforge.discipline.auth.AppUserRepository users;
    @Autowired com.selfforge.discipline.goal.GoalRepository goals;
    @Autowired com.selfforge.discipline.reward.RewardService rewards;
    @Autowired org.springframework.jdbc.core.JdbcTemplate accountingDb;

    @Test void habitStateHistoryIsOwnedAtomicAndIncludedInPersonalExport() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com"), other = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        String path = "/api/habits/" + habit + "/state-history";
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"targetPerWeek\":3,\"categoryId\":9223372036854775807}"))
                .andExpect(status().isNotFound());
        mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].kind").value("CREATED"))
                .andExpect(jsonPath("$.items[0].targetPerWeek").value(5));
        for (int retry = 0; retry < 2; retry++) mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"targetPerWeek\":7}"))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/habits/" + habit).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(4)).andExpect(jsonPath("$.items[0].active").value(true))
                .andExpect(jsonPath("$.items[1].active").value(false)).andExpect(jsonPath("$.items[2].targetPerWeek").value(7));
        mvc.perform(get(path).header("Authorization", "Bearer " + other)).andExpect(status().isNotFound());
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).param("beforeId", "0").header("Authorization", "Bearer " + token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/profile/data").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.habit_state_history.length()").value(4));
        mvc.perform(get("/api/profile/data").header("Authorization", "Bearer " + other)).andExpect(status().isOk())
                .andExpect(jsonPath("$.habit_state_history.length()").value(0));
    }

    @Test void habitStateHistoryCursorStaysStableWhenNewChangesArrive() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        for (int i = 0; i < 22; i++) mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"targetPerWeek\":" + (i % 2 == 0 ? 7 : 5) + "}"))
                .andExpect(status().isOk());
        String path = "/api/habits/" + habit + "/state-history";
        var first = json.readTree(mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(20)).andReturn().getResponse().getContentAsString());
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"targetPerWeek\":3}"))
                .andExpect(status().isOk());
        mvc.perform(get(path).param("beforeId", first.get("nextCursor").asText()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[2].kind").value("CREATED")).andExpect(jsonPath("$.nextCursor").doesNotExist());
    }

    @Test void staleHabitEditIsRejectedWithoutOverwritingTheNewerSave() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        var current = json.readTree(mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get(0);
        var expected = new java.util.LinkedHashMap<String, Object>();
        expected.put("name", current.get("name").asText());
        expected.put("description", null);
        expected.put("difficulty", current.get("difficulty").asText());
        expected.put("targetPerWeek", current.get("targetPerWeek").asInt());
        expected.put("points", current.get("points").asInt());
        expected.put("active", current.get("active").asBoolean());
        expected.put("categoryId", null);
        expected.put("tags", null);
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Newer save\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("targetPerWeek", 3, "expected", expected))))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].name").value("Newer save"))
                .andExpect(jsonPath("$[0].targetPerWeek").value(5));
    }

    @Test void weeklyTargetEditPreservesRecordedRestDaysAndPenaltyBasis() throws Exception {
        String email = UUID.randomUUID() + "@example.com", token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        var monday = userTime.today(user).with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).minusWeeks(1);
        String body = mvc.perform(post("/api/habits").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Schedule snapshot\",\"targetPerWeek\":5}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long habit = json.readTree(body).get("id").asLong();
        for (int offset = 8; offset >= 0; offset--) {
            mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                            "habitId", habit, "date", monday.minusDays(offset).toString(),
                            "status", offset == 1 || offset == 2 ? "SKIPPED" : "COMPLETED"))))
                    .andExpect(status().isCreated());
        }
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"targetPerWeek\":7}"))
                .andExpect(status().isOk());
        // Editing an existing day's note must keep its original schedule snapshot.
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "date", monday.minusDays(1).toString(), "status", "SKIPPED", "note", "Still a rest day"))))
                .andExpect(status().isCreated());
        for (String editedStatus : List.of("COMPLETED", "SKIPPED")) {
            mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                            "habitId", habit, "date", monday.minusDays(1).toString(), "status", editedStatus))))
                    .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/dashboard/today").header("Authorization", "Bearer " + token).param("date", monday.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.habits[0].currentStreak").value(7));
        org.junit.jupiter.api.Assertions.assertEquals(5, accountingDb.queryForObject(
                "select target_per_week_snapshot from daily_check_in where habit_id=? and check_date=?", Integer.class, habit, monday.minusDays(1)));
        // New days use the edited target, while the prior seven-day streak still sets the failure penalty.
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "date", monday.plusDays(1).toString(), "status", "FAILED"))))
                .andExpect(status().isCreated());
        var failure = accountingDb.queryForMap("select target_per_week_snapshot, failure_points_snapshot, applied_xp from daily_check_in where habit_id=? and check_date=?", habit, monday.plusDays(1));
        org.junit.jupiter.api.Assertions.assertEquals(7, ((Number) failure.get("target_per_week_snapshot")).intValue());
        org.junit.jupiter.api.Assertions.assertEquals(20, ((Number) failure.get("failure_points_snapshot")).intValue());
        org.junit.jupiter.api.Assertions.assertEquals(-20, ((Number) failure.get("applied_xp")).intValue());
        mvc.perform(get("/api/profile/data").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.check_ins[0].target_per_week_snapshot").value(5));
    }




    @Test void challengeStatusTracksRealCheckInsAndPreservesStoppedChoices() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        var today = userTime.today(user);
        long habit = createHabit(token), unrelated = createHabit(token);
        String body = mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "name", "Two real days", "targetDays", 2, "startDate", today.minusDays(1).toString()))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ACTIVE")).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        for (long currentHabit : java.util.List.of(habit, unrelated)) mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId", currentHabit, "status", "COMPLETED", "date", today.minusDays(3).toString()))))
                .andExpect(status().isCreated());
        for (var day : java.util.List.of(today.minusDays(1), today)) mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId", habit, "status", "COMPLETED", "date", day.toString()))))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/challenges").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$[0].status").value("COMPLETED")).andExpect(jsonPath("$[0].completedDays").value(2))
                .andExpect(jsonPath("$[0].remainingDays").value(0)).andExpect(jsonPath("$[0].completionRate").value(1.0));
        org.junit.jupiter.api.Assertions.assertEquals("COMPLETED", accountingDb.queryForObject("select status from challenge where id = ?", String.class, id));
        int xp = rewards.getUserProgress(user).totalXp();
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "status", "COMPLETED", "date", today.toString(), "note", "same completed day"))))
                .andExpect(status().isCreated());
        org.junit.jupiter.api.Assertions.assertEquals(xp, rewards.getUserProgress(user).totalXp());
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "status", "SKIPPED", "date", today.minusDays(1).toString())))).andExpect(status().isCreated());
        mvc.perform(get("/api/challenges/" + id + "/progress").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.completedDays").value(1));
        org.junit.jupiter.api.Assertions.assertEquals("ACTIVE", accountingDb.queryForObject("select status from challenge where id = ?", String.class, id));
        mvc.perform(patch("/api/challenges/" + id + "/status").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"ABANDONED\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "status", "COMPLETED", "date", today.minusDays(1).toString())))).andExpect(status().isCreated());
        mvc.perform(get("/api/challenges/" + id + "/progress").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.status").value("ABANDONED")).andExpect(jsonPath("$.completedDays").value(2));
    }

    @Test void challengesResolveExistingHistoryAndRejectPrematureCompletion() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email), other = register(UUID.randomUUID() + "@example.com");
        var today = userTime.today(users.findByEmail(email).orElseThrow());
        long habit = createHabit(token), emptyHabit = createHabit(token);
        for (var day : java.util.List.of(today.minusDays(2), today.minusDays(1))) mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId", habit, "status", "COMPLETED", "date", day.toString())))).andExpect(status().isCreated());
        mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "name", "Existing history", "targetDays", 2, "startDate", today.minusDays(2).toString()))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("COMPLETED"));
        String body = mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", emptyHabit, "name", "Not done", "targetDays", 2))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(patch("/api/challenges/" + id + "/status").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\"}")).andExpect(status().isConflict());
        mvc.perform(patch("/api/challenges/" + id + "/status").header("Authorization", "Bearer " + other).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"ABANDONED\"}")).andExpect(status().isNotFound());
        accountingDb.update("update challenge set status = 'COMPLETED' where id = ?", id);
        mvc.perform(get("/api/challenges/" + id + "/progress").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.completedDays").value(0));
    }

    @Test void accountDeletionRequiresPasswordConfirmationAndThrottlesGuessing() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        String correct = json.writeValueAsString(Map.of("currentPassword", "password123", "confirmationEmail", email));
        mvc.perform(delete("/api/profile/account").contentType(MediaType.APPLICATION_JSON).content(correct)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/profile/account").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}" )).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/profile/account").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword", "password123", "confirmationEmail", "other@example.com"))))
                .andExpect(status().isBadRequest());
        for (int i = 0; i < 4; i++) mvc.perform(delete("/api/profile/account").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword", "wrong", "confirmationEmail", email))))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/profile/account").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(correct)).andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "60"));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

    @Test void accountDeletionRemovesOwnedDataAndReceiptsWhileKeepingOtherAccounts() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long userId = users.findByEmail(email).orElseThrow().getId();
        String other = register(UUID.randomUUID() + "@example.com");
        for (String accountToken : java.util.List.of(token, other)) mvc.perform(put("/api/restart-plan").header("Authorization", "Bearer " + accountToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name", "Private restart", "reason", "BUSY", "start", "2026-10-14",
                "steps", java.util.List.of("Small step", "Repeat", "Review"), "expectedVersion", 0)))).andExpect(status().isOk());
        long habit = createHabit(token), foreignHabit = createHabit(other);
        checkIn(token, habit, "FAILED", "private");
        checkIn(token, habit, "COMPLETED", "private");
        checkIn(other, foreignHabit, "COMPLETED", "foreign history");
        long goal = createGoalForQuota(token);
        accountingDb.update("insert into goal_habit_plan(user_id,goal_id,habit_id,request_id) values (?,?,?,?)",userId,goal,habit,UUID.randomUUID().toString());
        accountingDb.update("insert into ai_coach_usage(user_id,usage_month,feature,request_count) values (?,current_date,'DAILY_FOCUS',1)", userId);
        accountingDb.update("insert into weekly_coach_advice(user_id,week_start,language,evidence_fingerprint,headline,observations_json,experiments_json,created_at) values (?,current_date,'vi',?,'Private AI advice','[]','[]',CURRENT_TIMESTAMP)", userId, "a".repeat(64));
        accountingDb.update("insert into goal_coach_plan(user_id,goal_id,language,evidence_fingerprint,headline,steps_json,habits_json,created_at) values (?,?, 'vi',?,'Private goal plan','[]','[]',CURRENT_TIMESTAMP)", userId, goal, "b".repeat(64));
        mvc.perform(post("/api/goals/" + goal + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("amount", 1, "requestId", UUID.randomUUID())))).andExpect(status().isOk());
        mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "name", "Private", "targetDays", 7, "requestId", UUID.randomUUID())))).andExpect(status().isCreated());
        mvc.perform(post("/api/journal").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("win", "private")))).andExpect(status().isCreated());
        accountingDb.update("insert into category(name,user_id) values ('Private category',?)", userId);
        accountingDb.update("insert into reminder(user_id,habit_id,reminder_time,days_of_week,enabled) values (?,?, '08:00', 'MON', true)", userId, habit);
        accountingDb.update("insert into streak_freeze(user_id,habit_id,freeze_date) values (?,?,current_date)", userId, habit);
        accountingDb.update("insert into pomodoro_session(user_id,duration_minutes,completed,note) values (?,25,true,'private')", userId);
        accountingDb.update("insert into mood_entry(user_id,mood_date,score) values (?,current_date,3)", userId);
        accountingDb.update("insert into weekly_review(user_id,week_start,rating,wins) values (?,current_date,3,'private')", userId);
        accountingDb.update("insert into custom_reward(user_id,name,xp_cost,claimed) values (?,'Private',10,false)", userId);
        accountingDb.update("insert into feedback_submission(user_id,feedback_type,summary,steps,expected_result,language,created_at,operator_status,operator_note) values (?,'BUG','Private beta report','Private steps','Private expected','vi',CURRENT_TIMESTAMP,'NEW','')", userId);
        accountingDb.update("insert into password_reset_code(user_id,send_count,attempts,consumed) values (?,0,0,false)", userId);
        accountingDb.update("insert into email_change_code(user_id,pending_email,send_count,attempts,consumed) values (?, ?,0,0,false)", userId, "pending@example.com");
        accountingDb.update("insert into registration_code(email,send_count,attempts,consumed) values (?,0,0,false)", email);
        long sharedCategories = accountingDb.queryForObject("select count(*) from category where user_id is null", Long.class);
        long sharedAchievements = accountingDb.queryForObject("select count(*) from achievement", Long.class);
        String secondSession = json.readTree(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "password123")))).andReturn().getResponse().getContentAsString()).get("token").asText();
        mvc.perform(delete("/api/profile/account").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("currentPassword", "password123", "confirmationEmail", email.toUpperCase(java.util.Locale.ROOT)))))
                .andExpect(status().isNoContent());
        for (String table : java.util.List.of("goal_habit_plan", "restart_plan", "daily_focus_plan", "habit", "category", "goal", "journal_entry", "mood_entry", "weekly_review", "challenge", "reminder",
                "streak_freeze", "pomodoro_session", "custom_reward", "feedback_submission", "user_achievement", "user_level", "penalty", "auth_session", "account_security_event", "password_reset_code", "email_change_code",
                "challenge_create_receipt", "habit_batch_receipt", "goal_create_receipt", "ai_coach_usage", "weekly_coach_advice", "goal_coach_plan")) org.junit.jupiter.api.Assertions.assertEquals(0,
                accountingDb.queryForObject("select count(*) from " + table + " where user_id = ?", Integer.class, userId));
        mvc.perform(get("/api/restart-plan").header("Authorization", "Bearer " + other)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Private restart"));
        org.junit.jupiter.api.Assertions.assertFalse(users.existsById(userId));
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject("select count(*) from daily_check_in where habit_id = ?", Integer.class, habit));
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject("select count(*) from goal_progress_receipt where goal_id = ?", Integer.class, goal));
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject("select count(*) from registration_code where email = ?", Integer.class, email));
        org.junit.jupiter.api.Assertions.assertEquals(sharedCategories, accountingDb.queryForObject("select count(*) from category where user_id is null", Long.class));
        org.junit.jupiter.api.Assertions.assertEquals(sharedAchievements, accountingDb.queryForObject("select count(*) from achievement", Long.class));
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject("select count(*) from habit_state_history where habit_id=?", Integer.class, habit));
        org.junit.jupiter.api.Assertions.assertEquals(1, accountingDb.queryForObject("select count(*) from habit_state_history where habit_id=?", Integer.class, foreignHabit));
        for (String session : java.util.List.of(token, secondSession)) mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + session)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + other)).andExpect(status().isOk()).andExpect(jsonPath("$[0].note").value("foreign history"));
        register(email);
    }

    @Test void accountDeletionRollsBackCompletelyWhenLegacyReferencesPreventRemoval() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email), other = register(UUID.randomUUID() + "@example.com");
        long userId = users.findByEmail(email).orElseThrow().getId();
        long habit = createHabit(token), foreignHabit = createHabit(other);
        checkIn(token, habit, "COMPLETED", "Keep my history");
        accountingDb.update("insert into category(name,user_id) values ('Legacy linked category',?)", userId);
        long category = accountingDb.queryForObject("select id from category where user_id = ?", Long.class, userId);
        accountingDb.update("update habit set category_id = ? where id = ?", category, foreignHabit);
        mvc.perform(delete("/api/profile/account").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("currentPassword", "password123", "confirmationEmail", email)))).andExpect(status().isConflict());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andExpect(jsonPath("$[0].note").value("Keep my history"));
        org.junit.jupiter.api.Assertions.assertTrue(users.existsById(userId));
        org.junit.jupiter.api.Assertions.assertEquals(category, accountingDb.queryForObject("select category_id from habit where id = ?", Long.class, foreignHabit));
    }

    @Test void pwaResourcesArePublicAndEntryDocumentsRequireRevalidation() throws Exception {
        mvc.perform(get("/manifest.webmanifest")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache"))
                .andExpect(content().contentTypeCompatibleWith("application/manifest+json"))
                .andExpect(jsonPath("$.display").value("standalone"))
                .andExpect(jsonPath("$.start_url").value("/"));
        mvc.perform(get("/sw.js")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache"));
        mvc.perform(get("/offline.html")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache"));
        for (String icon : java.util.List.of("/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-180.png"))
            mvc.perform(get(icon)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
        mvc.perform(get("/login")).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-cache"));
        mvc.perform(get("/api/profile/data")).andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test void applicationDeepLinksServeReactWithoutInterceptingMissingAssetsOrApis() throws Exception {
        for (String route : java.util.List.of("/", "/login", "/habits", "/journal", "/check-in-history", "/stats",
                "/challenges", "/rewards", "/pomodoro", "/review", "/goals", "/reminders", "/profile", "/premium")) {
            mvc.perform(get(route).param("source", "shared-link"))
                    .andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
        }
        mvc.perform(get("/assets/missing-test.js")).andExpect(status().isNotFound());
        String token = register(UUID.randomUUID() + "@example.com");
        mvc.perform(get("/api/missing-test").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test void staleCheckInEditsCannotOverwriteNotesOrChangeAccounting() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        checkIn(token, habit, "COMPLETED", "Original");
        var original = json.readTree(mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString()).get(0);
        checkIn(token, habit, "COMPLETED", "New device note");
        int xp = totalXp(token);
        int adjustments = accountingDb.queryForObject("select count(*) from check_in_xp_adjustment a join daily_check_in c on c.id=a.check_in_id where c.habit_id=?", Integer.class, habit);
        var expected = Map.of("id", original.get("id").asLong(), "status", "COMPLETED", "note", "Original");
        for (String state : java.util.List.of("COMPLETED", "FAILED")) {
            mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("habitId", habit, "status", state, "note", "Stale edit", "expected", expected))))
                    .andExpect(status().isConflict());
        }
        org.junit.jupiter.api.Assertions.assertEquals(xp, totalXp(token));
        org.junit.jupiter.api.Assertions.assertEquals(adjustments, accountingDb.queryForObject("select count(*) from check_in_xp_adjustment a join daily_check_in c on c.id=a.check_in_id where c.habit_id=?", Integer.class, habit));
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$[0].note").value("New device note"))
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));
        var latest = Map.of("id", original.get("id").asLong(), "status", "COMPLETED", "note", "New device note");
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "status", "SKIPPED", "note", "Reviewed latest", "expected", latest))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("SKIPPED"));
    }

    @Test void checkInNoteLimitAndEditsPreserveXpAndSavedState() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        long habit = createHabit(token);
        checkIn(token, habit, "COMPLETED", "Initial");
        int xp = rewards.getUserProgress(user).totalXp();
        String note = "a".repeat(255);
        checkIn(token, habit, "COMPLETED", note);
        org.junit.jupiter.api.Assertions.assertEquals(xp, rewards.getUserProgress(user).totalXp());
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "status", "FAILED", "note", "a".repeat(256)))))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].note").value(note))
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));
        org.junit.jupiter.api.Assertions.assertEquals(xp, rewards.getUserProgress(user).totalXp());
        checkIn(token, habit, "COMPLETED", "");
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].note").value(""));
        org.junit.jupiter.api.Assertions.assertEquals(xp, rewards.getUserProgress(user).totalXp());
    }

    @Test void profileTimezoneCatalogAndUpdatesSupportInternationalUsers() throws Exception {
        mvc.perform(get("/api/profile/timezones")).andExpect(status().isUnauthorized());
        String token = register(UUID.randomUUID() + "@example.com");
        var response = mvc.perform(get("/api/profile/timezones").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        var zones = json.readTree(response.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(zones.size() > 400);
        for (String zone : java.util.List.of("Europe/Paris", "Australia/Sydney", "Asia/Kathmandu", "UTC")) {
            org.junit.jupiter.api.Assertions.assertTrue(zones.toString().contains("\"" + zone + "\""));
            mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("timezone", zone))))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.timezone").value(zone));
        }
        mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("displayName", "  Updated name  ", "motto", ""))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value("Updated name"))
                .andExpect(jsonPath("$.timezone").value("UTC")).andExpect(jsonPath("$.motto").value(""));
        mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"en\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.language").value("en"));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.language").value("en"));
    }

    @Test void invalidProfileUpdatesAreAtomicAndLeaveOtherAccountsUnchanged() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String other = register(UUID.randomUUID() + "@example.com");
        String otherBefore = mvc.perform(get("/api/profile").header("Authorization", "Bearer " + other))
                .andReturn().getResponse().getContentAsString();
        String before = mvc.perform(get("/api/profile").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        for (var body : java.util.List.of(
                Map.of("displayName", "   ", "motto", "Must not persist"),
                Map.of("timezone", "", "displayName", "Must not persist"),
                Map.of("timezone", "Invalid/Zone", "displayName", "Must not persist"),
                Map.of("language", "fr"),
                Map.of("displayName", "x".repeat(101)),
                Map.of("motto", "x".repeat(256)))) {
            mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
            mvc.perform(get("/api/profile").header("Authorization", "Bearer " + token))
                    .andExpect(content().json(before));
        }
        mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"timezone\":\"Europe/Paris\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/profile").header("Authorization", "Bearer " + other)).andExpect(content().json(otherBefore));
    }

    @Test void weeklyReviewConcurrentSavesKeepOneRecordAndValidateLimits() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        var context = mvc.perform(get("/api/weekly-review/context").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        String week = json.readTree(context.getResponse().getContentAsString()).get("weekStart").asText();
        mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "rating", 3, "weekStart", java.time.LocalDate.parse(week).minusWeeks(1).toString(), "wins", "Old draft"))))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/weekly-review/history").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var tasks = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (int i = 0; i < 4; i++) {
                final String value = "review-" + i;
                tasks.add(pool.submit(() -> {
                    if (!start.await(10, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Timeout");
                    return mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                    "wins", value, "improvements", value, "nextWeekPlan", value, "rating", 4))))
                            .andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();
            for (var task : tasks) org.junit.jupiter.api.Assertions.assertEquals(201, task.get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
        var result = mvc.perform(get("/api/weekly-review/history").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1)).andReturn();
        var row = json.readTree(result.getResponse().getContentAsString()).get(0);
        org.junit.jupiter.api.Assertions.assertEquals(row.get("wins"), row.get("improvements"));
        org.junit.jupiter.api.Assertions.assertEquals(row.get("wins"), row.get("nextWeekPlan"));
        for (var body : java.util.List.of(Map.of("rating", 0), Map.of("rating", 6),
                Map.of("rating", 3, "wins", "x".repeat(2001)),
                Map.of("rating", 3, "improvements", "x".repeat(2001)),
                Map.of("rating", 3, "nextWeekPlan", "x".repeat(2001)))) {
            mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/weekly-review/history").header("Authorization", "Bearer " + token))
                .andExpect(content().json(result.getResponse().getContentAsString()));
        mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "wins", "x".repeat(2000), "improvements", "x".repeat(2000), "nextWeekPlan", "x".repeat(2000), "rating", 5))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.wins").value("x".repeat(2000)));
    }

    @Test void completedPomodoroNotesAreEditableWithoutChangingXpOrTiming() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String other = register(UUID.randomUUID() + "@example.com");
        var started = mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated()).andReturn();
        long id = json.readTree(started.getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(patch("/api/pomodoro/" + id + "/note").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("note", "Too early"))))
                .andExpect(status().isConflict());
        accountingDb.update("update pomodoro_session set started_at=? where id=?", java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(1600)), id);
        var finished = mvc.perform(post("/api/pomodoro/" + id + "/complete").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        var persisted = mvc.perform(get("/api/pomodoro/recent").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        var finish = json.readTree(persisted.getResponse().getContentAsString()).get(0);
        String progress = mvc.perform(get("/api/rewards/progress").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        for (String note : java.util.List.of("Read a chapter", "x".repeat(255), "")) {
            mvc.perform(patch("/api/pomodoro/" + id + "/note").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("note", note))))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.note").value(note))
                    .andExpect(jsonPath("$.completed").value(true))
                    .andExpect(jsonPath("$.endedAt").value(finish.get("endedAt").asText()));
        }
        mvc.perform(patch("/api/pomodoro/" + id + "/note").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("note", "Foreign"))))
                .andExpect(status().isNotFound());
        for (String body : java.util.List.of("{}", json.writeValueAsString(Map.of("note", "x".repeat(256))))) {
            mvc.perform(patch("/api/pomodoro/" + id + "/note").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/rewards/progress").header("Authorization", "Bearer " + token)).andExpect(content().json(progress));
    }

    @Test void concurrentPomodoroNotesKeepOneWinnerAndSupportExplicitReview() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String other = register(UUID.randomUUID() + "@example.com");
        var started = mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isCreated()).andReturn();
        long id = json.readTree(started.getResponse().getContentAsString()).get("id").asLong();
        accountingDb.update("update pomodoro_session set started_at=? where id=?", java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(1600)), id);
        mvc.perform(post("/api/pomodoro/" + id + "/complete").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        int xp = totalXp(token);
        var start = new java.util.concurrent.CountDownLatch(1);
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var results = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (String text : java.util.List.of("Device A", "Device B")) results.add(pool.submit(() -> {
                start.await();
                return mvc.perform(patch("/api/pomodoro/" + id + "/note").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("note", text, "expectedNote", ""))))
                        .andReturn().getResponse().getStatus();
            }));
            start.countDown();
            var statuses = new java.util.ArrayList<Integer>();
            for (var result : results) statuses.add(result.get(15, java.util.concurrent.TimeUnit.SECONDS));
            java.util.Collections.sort(statuses);
            org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200, 409), statuses);
        } finally { start.countDown(); pool.shutdownNow(); }
        var current = json.readTree(mvc.perform(get("/api/pomodoro/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(java.util.List.of("Device A", "Device B").contains(current.get("note").asText()));
        mvc.perform(get("/api/pomodoro/" + id).header("Authorization", "Bearer " + other)).andExpect(status().isNotFound());
        mvc.perform(patch("/api/pomodoro/" + id + "/note").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("note", "Reviewed latest", "expectedNote", current.get("note").asText()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.note").value("Reviewed latest"))
                .andExpect(jsonPath("$.endedAt").value(current.get("endedAt").asText()));
        mvc.perform(patch("/api/pomodoro/" + id + "/note").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("note", "Invalid base", "expectedNote", "x".repeat(256)))))
                .andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals(xp, totalXp(token));
    }

    @Test void pomodoroHistoryPagesStayPrivateAndStableWhenNewSessionsArrive() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        String foreignEmail = UUID.randomUUID() + "@example.com";
        String foreign = register(foreignEmail);
        long ownerId = users.findByEmail(email).orElseThrow().getId();
        long foreignId = users.findByEmail(foreignEmail).orElseThrow().getId();
        for (int i = 0; i < 45; i++) accountingDb.update("insert into pomodoro_session(user_id,duration_minutes,completed,started_at,note) values (?,25,?,?,?)",
                ownerId, i % 2 == 0, java.sql.Timestamp.from(java.time.Instant.now().minusSeconds((45-i)*86400L)), "Owner " + i);
        accountingDb.update("insert into pomodoro_session(user_id,duration_minutes,completed,started_at,note) values (?,25,true,?,?)",
                foreignId, java.sql.Timestamp.from(java.time.Instant.now()), "FOREIGN_SECRET");
        var first = json.readTree(mvc.perform(get("/api/pomodoro/history").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(20)).andReturn().getResponse().getContentAsString());
        var ids = new java.util.HashSet<Long>();
        for (var item : first.get("items")) { ids.add(item.get("id").asLong()); org.junit.jupiter.api.Assertions.assertTrue(item.get("note").asText().startsWith("Owner ")); }
        mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated());
        long cursor = first.get("nextCursor").asLong();
        for (int expectedCount : java.util.List.of(20, 5)) {
            var next = json.readTree(mvc.perform(get("/api/pomodoro/history").param("beforeId", Long.toString(cursor)).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(expectedCount)).andReturn().getResponse().getContentAsString());
            for (var item : next.get("items")) {
                org.junit.jupiter.api.Assertions.assertTrue(ids.add(item.get("id").asLong()), "Duplicate session across pages");
                org.junit.jupiter.api.Assertions.assertTrue(item.get("note").asText().startsWith("Owner "));
                org.junit.jupiter.api.Assertions.assertTrue(item.get("id").asLong() < cursor);
            }
            if (expectedCount == 5) org.junit.jupiter.api.Assertions.assertTrue(next.get("nextCursor").isNull());
            else cursor = next.get("nextCursor").asLong();
        }
        org.junit.jupiter.api.Assertions.assertEquals(45, ids.size());
        mvc.perform(get("/api/pomodoro/history").param("completed", "true").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(20)).andExpect(jsonPath("$.items[*].completed", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(true))));
        mvc.perform(get("/api/pomodoro/history").header("Authorization", "Bearer " + foreign))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].note").value("FOREIGN_SECRET"));
        mvc.perform(get("/api/pomodoro/history")).andExpect(status().isUnauthorized());
        for (String invalid : java.util.List.of("0", "-1", "abc")) mvc.perform(get("/api/pomodoro/history").param("beforeId", invalid).header("Authorization", "Bearer " + token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/pomodoro/recent").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(20));
    }

    @Test void concurrentGoalEditsAndStaleProgressSnapshotsDoNotOverwriteNewState() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String foreign = register(UUID.randomUUID() + "@example.com");
        var initial = json.readTree(mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Read\",\"targetValue\":10}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        long id = initial.get("id").asLong();
        var start = new java.util.concurrent.CountDownLatch(1);
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var results = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (String name : java.util.List.of("Device A", "Device B")) results.add(pool.submit(() -> {
                start.await();
                return mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", name, "expected", initial))))
                        .andReturn().getResponse().getStatus();
            }));
            start.countDown();
            var statuses = new java.util.ArrayList<Integer>();
            for (var result : results) statuses.add(result.get(15, java.util.concurrent.TimeUnit.SECONDS));
            java.util.Collections.sort(statuses);
            org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200, 409), statuses);
        } finally { start.countDown(); pool.shutdownNow(); }
        var beforeProgress = json.readTree(mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString()).get(0);
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("amount", 2, "requestId", UUID.randomUUID().toString())))).andExpect(status().isOk());
        mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("targetValue", 1, "expected", beforeProgress)))).andExpect(status().isConflict());
        var latest = json.readTree(mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].targetValue").value(10)).andExpect(jsonPath("$[0].currentValue").value(2))
                .andExpect(jsonPath("$[0].status").value("ACTIVE")).andReturn().getResponse().getContentAsString()).get(0);
        mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("name", "Reviewed latest", "targetValue", 12, "expected", latest))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Reviewed latest")).andExpect(jsonPath("$.currentValue").value(2));
        mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + foreign).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("name", "Foreign overwrite", "expected", latest)))).andExpect(status().isNotFound());
    }

    @Test void staleGoalLifecycleActionsCannotDeleteProgressOrReceipts() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        var initial = json.readTree(mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Read\",\"targetValue\":12}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        long id = initial.get("id").asLong();
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("amount", 2, "requestId", UUID.randomUUID().toString())))).andExpect(status().isOk());
        for (String action : java.util.List.of("abandon", "restore")) mvc.perform(post("/api/goals/" + id + "/" + action)
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(initial)))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/goals/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(initial))).andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(1, accountingDb.queryForObject("select count(*) from goal_progress_receipt where goal_id=?", Integer.class, id));
        var latest = json.readTree(mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].currentValue").value(2)).andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andReturn().getResponse().getContentAsString()).get(0);
        var abandoned = json.readTree(mvc.perform(post("/api/goals/" + id + "/abandon").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(latest)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.currentValue").value(2)).andReturn().getResponse().getContentAsString());
        var restored = json.readTree(mvc.perform(post("/api/goals/" + id + "/restore").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(abandoned)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE")).andReturn().getResponse().getContentAsString());
        mvc.perform(delete("/api/goals/" + id).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(restored))).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject("select count(*) from goal_progress_receipt where goal_id=?", Integer.class, id));
    }

    @Test void personalDataExportIsFreePrivateAndIncludesOldHistory() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        String other = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        long foreign = createHabit(other);
        checkIn(token, habit, "COMPLETED", "Owner history");
        checkIn(other, foreign, "COMPLETED", "FOREIGN_SECRET");
        accountingDb.update("update daily_check_in set check_date=? where habit_id=?", java.time.LocalDate.now().minusYears(2), habit);
        mvc.perform(post("/api/journal").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"win\":\"Private journal\"}"))
                .andExpect(status().isCreated());
        long ownerId = users.findByEmail(email).orElseThrow().getId();
        accountingDb.update("insert into ai_coach_usage(user_id,usage_month,feature,request_count) values (?,current_date,'DAILY_FOCUS',2)", ownerId);
        var result = mvc.perform(get("/api/profile/data").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.profile.email").value(email))
                .andExpect(jsonPath("$.profile.termsVersion").value("2026-10-28"))
                .andExpect(jsonPath("$.profile.termsAcceptedAt").exists())
                .andExpect(jsonPath("$.account_security_event.length()").value(1))
                .andExpect(jsonPath("$.account_security_event[0].event_type").value("REGISTERED"))
                .andExpect(jsonPath("$.habit.length()").value(1))
                .andExpect(jsonPath("$.check_ins.length()").value(1))
                .andExpect(jsonPath("$.check_ins[0].note").value("Owner history"))
                .andExpect(jsonPath("$.journal_entry[0].win").value("Private journal"))
                .andExpect(jsonPath("$.ai_coach_usage.length()").value(1))
                .andExpect(jsonPath("$.ai_coach_usage[0].feature").value("DAILY_FOCUS"))
                .andExpect(jsonPath("$.ai_coach_usage[0].request_count").value(2))
                .andExpect(jsonPath("$.check_in_xp_adjustments.length()").value(1)).andReturn();
        String body = result.getResponse().getContentAsString();
        for (String secret : java.util.List.of("FOREIGN_SECRET", "password_hash", "token_hash", "code_hash", token))
            org.junit.jupiter.api.Assertions.assertFalse(body.contains(secret));
        mvc.perform(get("/api/profile/data")).andExpect(status().isUnauthorized());
    }

    @Test void longJournalContentRoundTripsAtTheLimit() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String value = "Nhật ký dài. ".repeat(500).substring(0, 5000);
        var body = Map.of("win", value, "obstacle", value, "lesson", value, "tomorrowFocus", value);
        mvc.perform(post("/api/journal").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isCreated());
        var result = mvc.perform(get("/api/journal").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andReturn();
        var row = json.readTree(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        for (String field : body.keySet()) org.junit.jupiter.api.Assertions.assertEquals(value, row.get(field).asText());
    }

    @Test void concurrentJournalSavesKeepOneCoherentEntry() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (int i = 0; i < 4; i++) {
                final String value = "entry-" + i;
                futures.add(executor.submit(() -> {
                    if (!start.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Timeout");
                    return mvc.perform(post("/api/journal").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                    "win", value, "obstacle", value, "lesson", value, "tomorrowFocus", value))))
                            .andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();
            for (var future : futures) org.junit.jupiter.api.Assertions.assertEquals(201, future.get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
        var response = mvc.perform(get("/api/journal").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andReturn();
        var row = json.readTree(response.getResponse().getContentAsString());
        for (String field : java.util.List.of("obstacle", "lesson", "tomorrowFocus")) org.junit.jupiter.api.Assertions.assertEquals(row.get("win"), row.get(field));
        mvc.perform(get("/api/journal/dates").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(1));
        for (String field : java.util.List.of("win", "obstacle", "lesson", "tomorrowFocus")) {
            mvc.perform(post("/api/journal").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(field, "x".repeat(5001)))))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test void concurrentMoodWritesKeepOneCompleteDailyRecord() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (int i = 1; i <= 4; i++) {
                final int score = i;
                futures.add(executor.submit(() -> {
                    if (!start.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Timeout");
                    return mvc.perform(post("/api/mood").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                    "score", score, "note", "note-" + score))))
                            .andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();
            for (var future : futures) org.junit.jupiter.api.Assertions.assertEquals(200, future.get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
        var result = mvc.perform(get("/api/mood/history?days=1").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1)).andReturn();
        var row = json.readTree(result.getResponse().getContentAsString()).get(0);
        org.junit.jupiter.api.Assertions.assertEquals("note-" + row.get("score").asInt(), row.get("note").asText());
    }

    @Test void moodHistoryUsesExactInclusiveDaysAndRejectsInvalidInput() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        var today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        for (int daysAgo : new int[]{0, 6, 7, 29, 30}) {
            mvc.perform(post("/api/mood").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                            "date", today.minusDays(daysAgo).toString(), "score", 4))))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/mood/history?days=1").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/mood/history?days=7").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/mood/history?days=30").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(4));
        for (int days : new int[]{0, -1, 367, Integer.MAX_VALUE}) {
            mvc.perform(get("/api/mood/history?days=" + days).header("Authorization", "Bearer " + token)).andExpect(status().isBadRequest());
        }
        for (String invalid : java.util.List.of("{}", "{\"score\":0}", "{\"score\":6}",
                json.writeValueAsString(Map.of("score", 4, "note", "x".repeat(256))))) {
            mvc.perform(post("/api/mood").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(invalid)).andExpect(status().isBadRequest());
        }
    }

    @Test void inactiveHabitsArePrivateAndReactivationKeepsHistoryAndQuota() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        checkIn(token, habit, "COMPLETED", "Keep history");
        mvc.perform(delete("/api/habits/" + habit).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/habits/inactive").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(habit));
        String other = register(UUID.randomUUID() + "@example.com");
        mvc.perform(get("/api/habits/inactive").header("Authorization", "Bearer " + other)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/habits/inactive")).andExpect(status().isUnauthorized());
        for (int n = 0; n < 10; n++) createHabit(token);
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
                .andExpect(status().isConflict());
        var active = mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token)).andReturn();
        long replacement = json.readTree(active.getResponse().getContentAsString()).get(0).get("id").asLong();
        mvc.perform(delete("/api/habits/" + replacement).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        for (int n = 0; n < 2; n++) mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(true));
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(10));
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$[0].note").value("Keep history"));
    }

    @Test void categoryManagerRetriesAndConcurrentEditsPreserveOwnedMetadata() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");String body=json.writeValueAsString(Map.of("name","Study","color","#123abc","icon","Book"));
        String value=mvc.perform(post("/api/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(value).get("id").asLong();
        mvc.perform(post("/api/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        var edited=new java.util.HashMap<String,Object>(Map.of("name","Reading","color","#abcdef","icon","Read","expected",Map.of("name","Study","color","#123abc","icon","Book")));
        for(int retry=0;retry<2;retry++)mvc.perform(patch("/api/categories/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(edited))).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Reading"));
        edited.put("name","Stale edit");mvc.perform(patch("/api/categories/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(edited))).andExpect(status().isConflict());
        String other=register(UUID.randomUUID()+"@example.com");mvc.perform(patch("/api/categories/"+id).header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());mvc.perform(delete("/api/categories/"+id).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(post("/api/categories").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.not((int)id)));
        mvc.perform(post("/api/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name","x".repeat(256))))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name","Bad","color","red")))).andExpect(status().isBadRequest());
    }

    @Test void checkInHistorySearchIsLiteralOwnedAndPaginatesWithinTheSameDate() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var today=userTime.today(users.findByEmail(email).orElseThrow());var from=today.minusDays(7);long first=createHabit(token),second=createHabit(token),third=createHabit(token),similar=createHabit(token),foreign=createHabit(other);
        for(int offset=0;offset<8;offset++)for(long habit:List.of(first,second,third))mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.minusDays(offset).toString(),"status",habit==third?"SKIPPED":"FAILED","note","100%_ literal")))).andExpect(status().isCreated());
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",similar,"date",today.toString(),"status","COMPLETED","note","100xy lookalike")))).andExpect(status().isCreated());
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",foreign,"date",today.toString(),"status","FAILED","note","100%_ PRIVATE")))).andExpect(status().isCreated());
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",first,"date",from.minusDays(1).toString(),"status","FAILED","note","100%_ out of range")))).andExpect(status().isCreated());
        String value=mvc.perform(get("/api/check-ins/history").header("Authorization","Bearer "+token).param("q","100%_").param("fromDate",from.toString()).param("toDate",today.toString())).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(20)).andReturn().getResponse().getContentAsString();var firstPage=json.readTree(value);var cursor=firstPage.get("nextCursor");var ids=new java.util.HashSet<Long>();for(var row:firstPage.get("items")){ids.add(row.get("id").asLong());org.junit.jupiter.api.Assertions.assertNotEquals(foreign,row.get("habitId").asLong());}
        value=mvc.perform(get("/api/check-ins/history").header("Authorization","Bearer "+token).param("q","100%_").param("fromDate",from.toString()).param("toDate",today.toString()).param("beforeDate",cursor.get("date").asText()).param("beforeId",cursor.get("id").asText())).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(4)).andExpect(jsonPath("$.nextCursor").isEmpty()).andReturn().getResponse().getContentAsString();for(var row:json.readTree(value).get("items"))org.junit.jupiter.api.Assertions.assertTrue(ids.add(row.get("id").asLong()));org.junit.jupiter.api.Assertions.assertEquals(24,ids.size());org.junit.jupiter.api.Assertions.assertFalse(value.contains("PRIVATE"));
        var exported=mvc.perform(get("/api/check-ins/history/export").header("Authorization","Bearer "+token).param("q","100%_").param("fromDate",from.toString()).param("toDate",today.toString())).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(24)).andReturn().getResponse().getContentAsString();org.junit.jupiter.api.Assertions.assertFalse(exported.contains("PRIVATE"));
        mvc.perform(get("/api/check-ins/history/export").header("Authorization","Bearer "+token).param("q","100%_").param("status","FAILED").param("fromDate",from.toString()).param("toDate",today.toString())).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(16));
        mvc.perform(get("/api/check-ins/history/export").param("fromDate",from.toString()).param("toDate",today.toString())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/check-ins/history/export").header("Authorization","Bearer "+token).param("fromDate",today.minusDays(366).toString()).param("toDate",today.toString())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/check-ins/history").header("Authorization","Bearer "+token).param("q","100%_").param("status","FAILED").param("fromDate",from.toString()).param("toDate",today.toString())).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(16));
        mvc.perform(get("/api/check-ins/history").header("Authorization","Bearer "+token).param("status","BAD")).andExpect(status().isBadRequest());mvc.perform(get("/api/check-ins/history").header("Authorization","Bearer "+token).param("beforeId","1")).andExpect(status().isBadRequest());mvc.perform(get("/api/check-ins/history").header("Authorization","Bearer "+token).param("fromDate",today.minusDays(366).toString())).andExpect(status().isBadRequest());mvc.perform(get("/api/check-ins/history")).andExpect(status().isUnauthorized());
    }

    @Test void reminderEditsAndTogglesRequireReviewedSnapshotAndAllowSafeRetries() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);
        String value=mvc.perform(post("/api/reminders").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"reminderTime","09:30:15","daysOfWeek","MON,TUE","message","Old")))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(value).get("id").asLong();
        var expected=Map.of("reminderTime","09:30:15","daysOfWeek","MON,TUE","message","Old","enabled",true);
        var edit=new java.util.HashMap<String,Object>(Map.of("reminderTime","09:30:15","daysOfWeek","MON,TUE","message","New","expected",expected));
        for(int retry=0;retry<2;retry++)mvc.perform(patch("/api/reminders/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(edit))).andExpect(status().isOk()).andExpect(jsonPath("$.reminderTime").value("09:30:15")).andExpect(jsonPath("$.message").value("New"));
        edit.put("reminderTime","10:00");mvc.perform(patch("/api/reminders/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(edit))).andExpect(status().isConflict());
        mvc.perform(patch("/api/reminders/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("enabled",false,"expected",expected)))).andExpect(status().isConflict());
        var latest=Map.of("reminderTime","09:30:15","daysOfWeek","MON,TUE","message","New","enabled",true);
        for(int retry=0;retry<2;retry++)mvc.perform(patch("/api/reminders/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("enabled",false,"expected",latest)))).andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(get("/api/reminders/"+id).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.message").value("New")).andExpect(jsonPath("$.reminderTime").value("09:30:15"));
        mvc.perform(get("/api/reminders/"+id).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());mvc.perform(get("/api/reminders/"+id)).andExpect(status().isUnauthorized());
    }

    @Test void categoryActivityUsesOwnedCheckInsAndCurrentAssignmentsIncludingArchivedHabits() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var today=userTime.today(users.findByEmail(email).orElseThrow());var month=java.time.YearMonth.from(today);long first=createHabit(token),second=createHabit(token),third=createHabit(token),foreign=createHabit(other);
        long category=json.readTree(mvc.perform(post("/api/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Reading\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        long foreignCategory=json.readTree(mvc.perform(post("/api/categories").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"PRIVATE_CATEGORY\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        for(long id:List.of(first,third))mvc.perform(patch("/api/habits/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("categoryId",category)))).andExpect(status().isOk());
        for(var item:List.of(Map.entry(first,"COMPLETED"),Map.entry(second,"FAILED"),Map.entry(third,"SKIPPED")))mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",item.getKey(),"status",item.getValue(),"date",today.toString(),"note","PRIVATE_NOTE")))).andExpect(status().isCreated());
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",first,"status","COMPLETED","date",month.atDay(1).minusDays(1).toString())))).andExpect(status().isCreated());
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",foreign,"status","COMPLETED","date",today.toString())))).andExpect(status().isCreated());
        mvc.perform(delete("/api/habits/"+first).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        accountingDb.update("update habit set category_id=? where id=?",foreignCategory,second);
        String value=mvc.perform(get("/api/stats/categories").param("month",month.toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.checkIns").value(3)).andExpect(jsonPath("$.completed").value(1)).andExpect(jsonPath("$.failed").value(1)).andExpect(jsonPath("$.skipped").value(1)).andExpect(jsonPath("$.categories[0].categoryId").value(category)).andExpect(jsonPath("$.categories[0].habits").value(2)).andExpect(jsonPath("$.categories[0].skipped").value(1)).andExpect(jsonPath("$.categories[1].categoryId").isEmpty()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(value.contains("PRIVATE_"));
        mvc.perform(patch("/api/habits/"+third).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"clearCategory\":true}")).andExpect(status().isOk());
        mvc.perform(get("/api/stats/categories").param("month",month.toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.categories[0].habits").value(1)).andExpect(jsonPath("$.categories[1].checkIns").value(2));
        mvc.perform(get("/api/stats/categories").param("month",month.plusMonths(1).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/stats/categories").param("month",month.minusMonths(24).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/stats/categories")).andExpect(status().isUnauthorized());
    }

    @Test void bulkCategoryAssignmentIsOwnedAtomicRetryableAndPreservesArchivedHabits() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");long first=createHabit(token),second=createHabit(token);
        mvc.perform(delete("/api/habits/"+second).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        String categoryJson=mvc.perform(post("/api/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Batch category\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long category=json.readTree(categoryJson).get("id").asLong();
        var items=List.of(Map.of("habitId",first,"expected",java.util.Collections.singletonMap("categoryId",null)),Map.of("habitId",second,"expected",java.util.Collections.singletonMap("categoryId",null)));
        var body=new java.util.HashMap<String,Object>();body.put("categoryId",category);body.put("items",items);
        for(int retry=0;retry<2;retry++)mvc.perform(patch("/api/habits/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[1].active").value(false));
        mvc.perform(patch("/api/habits/"+first).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"clearCategory\":true}")).andExpect(status().isOk());
        var expectedCategory=Map.of("categoryId",category);body.put("categoryId",null);body.put("items",List.of(Map.of("habitId",second,"expected",expectedCategory),Map.of("habitId",first,"expected",expectedCategory)));
        mvc.perform(patch("/api/habits/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(category,accountingDb.queryForObject("select category_id from habit where id=?",Long.class,second));
        String other=register(UUID.randomUUID()+"@example.com");long foreign=createHabit(other);
        body.put("items",List.of(Map.of("habitId",second,"expected",expectedCategory),Map.of("habitId",foreign,"expected",java.util.Collections.singletonMap("categoryId",null))));
        mvc.perform(patch("/api/habits/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isNotFound());
        org.junit.jupiter.api.Assertions.assertEquals(category,accountingDb.queryForObject("select category_id from habit where id=?",Long.class,second));
        body.put("categoryId",category);body.put("items",List.of(Map.of("habitId",foreign,"expected",java.util.Collections.singletonMap("categoryId",null))));
        mvc.perform(patch("/api/habits/categories").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isNotFound());
        body.put("categoryId",null);body.put("items",List.of(Map.of("habitId",second,"expected",expectedCategory),Map.of("habitId",second,"expected",expectedCategory)));
        mvc.perform(patch("/api/habits/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body.put("items",List.of(Map.of("habitId",second,"expected",expectedCategory),Map.of("habitId",first,"expected",java.util.Collections.singletonMap("categoryId",null))));
        mvc.perform(patch("/api/habits/categories").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$[0].categoryId").isEmpty()).andExpect(jsonPath("$[0].active").value(false));
    }

    @Test void categoryCanBeClearedAndUsedCategoryCannotBeDeleted() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        var result = mvc.perform(post("/api/categories").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Mine\"}"))
                .andExpect(status().isCreated()).andReturn();
        long category = json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        long habit = createHabit(token);
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("categoryId", category))))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/categories/" + category).header("Authorization", "Bearer " + token)).andExpect(status().isConflict());
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Renamed\"}"))
                .andExpect(jsonPath("$.categoryId").value(category));
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("categoryId", category, "clearCategory", true))))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"clearCategory\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.categoryId").isEmpty());
        mvc.perform(delete("/api/categories/" + category).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
    }

    @Test void changingDifficultyUpdatesFuturePointsButKeepsCheckInSnapshot() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        checkIn(token, habit, "COMPLETED", "Original");
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\":\"HARD\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.points").value(20));
        checkIn(token, habit, "COMPLETED", "Retry");
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].scoreImpact").value(10));
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\":\"EASY\",\"points\":12}"))
                .andExpect(jsonPath("$.points").value(12));
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\":\"EASY\",\"name\":\"Rename\"}"))
                .andExpect(jsonPath("$.points").value(12));
    }

    @Test void privateCategoriesCannotBeAttachedByAnotherAccount() throws Exception {
        String owner = register(UUID.randomUUID() + "@example.com");
        String other = register(UUID.randomUUID() + "@example.com");
        var response = mvc.perform(post("/api/categories").header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Private category\"}"))
                .andExpect(status().isCreated()).andReturn();
        long category = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();
        String body = json.writeValueAsString(Map.of("name", "Habit", "categoryId", category));
        mvc.perform(post("/api/habits").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());
        long habit = createHabit(other);
        accountingDb.update("update habit set category_id = ? where id = ?", category, habit);
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());
        mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habits",
                        java.util.List.of(Map.of("name", "Valid"), Map.of("name", "Private", "categoryId", category))))))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + other))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].categoryId").isEmpty())
                .andExpect(jsonPath("$[0].categoryName").isEmpty()).andExpect(jsonPath("$[0].categoryColor").isEmpty());
        mvc.perform(post("/api/habits").header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
    }

    @Test void systemCategoriesAreReadableButCannotBeEdited() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        var result = mvc.perform(get("/api/categories").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        long id = 0;
        for (var category : json.readTree(result.getResponse().getContentAsString())) {
            if (category.get("systemDefault").asBoolean()) { id = category.get("id").asLong(); break; }
        }
        org.junit.jupiter.api.Assertions.assertTrue(id > 0);
        mvc.perform(patch("/api/categories/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Changed globally\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/habits").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name", "Shared", "categoryId", id))))
                .andExpect(status().isCreated());
        for (String field : java.util.List.of("name", "description", "tags")) {
            var body = new java.util.HashMap<String, Object>(); body.put("name", "Valid"); body.put(field, "x".repeat(256));
            mvc.perform(post("/api/habits").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test void habitOrderPersistsAndRejectsInvalidOrForeignItemsAtomically() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long first = createHabit(token), second = createHabit(token);
        String foreign = register(UUID.randomUUID() + "@example.com");
        long foreignId = createHabit(foreign);
        String valid = json.writeValueAsString(Map.of("items", java.util.List.of(
                Map.of("id", second, "sortOrder", 0), Map.of("id", first, "sortOrder", 1))));
        mvc.perform(patch("/api/habits/reorder").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(valid)).andExpect(status().isForbidden());
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        mvc.perform(patch("/api/habits/reorder").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(valid)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(second));
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].id").value(second));
        String mixed = json.writeValueAsString(Map.of("items", java.util.List.of(
                Map.of("id", second, "sortOrder", 99), Map.of("id", foreignId, "sortOrder", 5))));
        mvc.perform(patch("/api/habits/reorder").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(mixed)).andExpect(status().isNotFound());
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].id").value(second)).andExpect(jsonPath("$[0].sortOrder").value(0));
        for (String invalid : java.util.List.of("{}", "{\"items\":[]}", "{\"items\":[null]}",
                json.writeValueAsString(Map.of("items", java.util.List.of(Map.of("id", first)))),
                json.writeValueAsString(Map.of("items", java.util.List.of(Map.of("id", first, "sortOrder", -1)))),
                json.writeValueAsString(Map.of("items", java.util.List.of(Map.of("id", first, "sortOrder", 1, "stackGroup", "x".repeat(256))))),
                json.writeValueAsString(Map.of("items", java.util.List.of(Map.of("id", first, "sortOrder", 1), Map.of("id", first, "sortOrder", 2)))))) {
            mvc.perform(patch("/api/habits/reorder").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(invalid)).andExpect(status().isBadRequest());
        }
        mvc.perform(delete("/api/habits/" + first).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(patch("/api/habits/reorder").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(valid)).andExpect(status().isNotFound());
        mvc.perform(patch("/api/habits/reorder").contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isUnauthorized());
    }

    @Test void habitBatchReplayDoesNotDuplicateOrReactivate() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String requestId = UUID.randomUUID().toString();
        var payload = Map.of("requestId", requestId, "habits", java.util.List.of(Map.of("name", "Read")));
        String body = json.writeValueAsString(payload);
        var result = mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn();
        long id = json.readTree(result.getResponse().getContentAsString()).get(0).get("id").asLong();
        for (int n = 0; n < 3; n++) {
            mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated())
                    .andExpect(jsonPath("$[0].id").value(id));
        }
        mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body.replace("Read", "Changed")))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/habits/" + id).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].id").value(id));
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(0));
        String other = register(UUID.randomUUID() + "@example.com");
        mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + other)).andExpect(jsonPath("$.length()").value(1));
    }

    @Test void habitBatchRollsBackIfQuotaIsExceeded() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        for (int i = 0; i < 9; i++) createHabit(token);
        mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"habits\":[{\"name\":\"First\"},{\"name\":\"Second\"}]}"))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(9));
    }

    @Test void habitBatchValidatesAllItemsAndCreatesTogether() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        for (String payload : java.util.List.of("{}", "{\"habits\":[]}",
                "{\"habits\":[null]}", "{\"habits\":[{\"name\":\"Valid\"},{\"name\":\"\"}]}")) {
            mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/habits/batch").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"habits\":[{\"name\":\"First\"},{\"name\":\"Second\"}]}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.length()").value(2));
        String other = register(UUID.randomUUID() + "@example.com");
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + other))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/habits/batch").contentType(MediaType.APPLICATION_JSON)
                .content("{\"habits\":[{\"name\":\"First\"}]}"))
                .andExpect(status().isUnauthorized());
    }

    @Test void sessionManagementProtectsOwnershipAndKeepsCurrentSession() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String first = register(email);
        String foreign = register(UUID.randomUUID() + "@example.com");
        var login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "password123"))))
                .andExpect(status().isOk()).andReturn();
        String second = json.readTree(login.getResponse().getContentAsString()).get("token").asText();
        var result = mvc.perform(get("/api/profile/sessions").header("Authorization", "Bearer " + first))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].tokenHash").doesNotExist()).andReturn();
        long secondId = 0;
        long firstId = 0;
        int currentCount = 0;
        for (var row : json.readTree(result.getResponse().getContentAsString())) {
            if (row.get("current").asBoolean()) { currentCount++; firstId = row.get("id").asLong(); }
            else secondId = row.get("id").asLong();
        }
        org.junit.jupiter.api.Assertions.assertEquals(1, currentCount);
        mvc.perform(delete("/api/profile/sessions/" + secondId).header("Authorization", "Bearer " + foreign))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + second)).andExpect(status().isOk());
        mvc.perform(delete("/api/profile/sessions/others").header("Authorization", "Bearer " + first))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + second)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + first)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + foreign)).andExpect(status().isOk());
        mvc.perform(delete("/api/profile/sessions/" + secondId).header("Authorization", "Bearer " + first))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/profile/sessions/" + firstId).header("Authorization", "Bearer " + first))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + first)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/profile/sessions")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/profile/sessions/others")).andExpect(status().isUnauthorized());
    }

    @Test void accountSecurityActivityIsPrivateSparseAndTracksRealSecurityActions() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String first = register(email);
        String other = register(UUID.randomUUID() + "@example.com");
        String second = json.readTree(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "password123"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
        mvc.perform(delete("/api/profile/sessions/others").header("Authorization", "Bearer " + first)).andExpect(status().isNoContent());
        mvc.perform(get("/api/profile/security-events").header("Authorization", "Bearer " + first))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].type").value("OTHER_SESSIONS_REVOKED"))
                .andExpect(jsonPath("$.items[0].id").isNumber()).andExpect(jsonPath("$.items[0].occurredAt").isString())
                .andExpect(jsonPath("$.items[0].email").doesNotExist()).andExpect(jsonPath("$.items[0].token").doesNotExist())
                .andExpect(jsonPath("$.items[0].ip").doesNotExist());
        mvc.perform(get("/api/profile/security-events").header("Authorization", "Bearer " + other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].type").value("REGISTERED"));
        mvc.perform(get("/api/profile/security-events").param("beforeId", "0").header("Authorization", "Bearer " + first))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + second)).andExpect(status().isUnauthorized());
    }

    @Test void v2UpgradePreservesLegacyCheckInWithoutGuessingItsXp() {
        String schema = "upgrade_" + UUID.randomUUID().toString().replace("-", "");
        var v1 = org.flywaydb.core.Flyway.configure().dataSource(accountingDb.getDataSource())
                .schemas(schema).defaultSchema(schema).locations("classpath:db/migration/postgresql")
                .target("1").load();
        v1.migrate();
        String schemaSql = "\"" + schema + "\"";
        accountingDb.update("insert into " + schemaSql + ".habit (id, name, active, points, sort_order, target_per_week) values (1, 'Legacy habit', true, 10, 0, 5)");
        accountingDb.update("insert into " + schemaSql + ".daily_check_in (id, habit_id, check_date, status, note) values (1, 1, ?, 'COMPLETED', 'Keep me')",
                java.time.LocalDate.of(2026, 9, 20));
        var upgraded = org.flywaydb.core.Flyway.configure().dataSource(accountingDb.getDataSource())
                .schemas(schema).defaultSchema(schema).locations("classpath:db/migration/postgresql").load();
        org.junit.jupiter.api.Assertions.assertEquals(52, upgraded.migrate().migrationsExecuted);
        var row = accountingDb.queryForMap("select note, applied_xp, points_snapshot, target_per_week_snapshot from " + schemaSql + ".daily_check_in where id = 1");
        org.junit.jupiter.api.Assertions.assertEquals("Keep me", row.get("note"));
        org.junit.jupiter.api.Assertions.assertNull(row.get("applied_xp"));
        org.junit.jupiter.api.Assertions.assertNull(row.get("points_snapshot"));
        org.junit.jupiter.api.Assertions.assertNull(row.get("target_per_week_snapshot"));
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject("select count(*) from " + schemaSql + ".habit_state_history", Integer.class));
        org.junit.jupiter.api.Assertions.assertEquals(0, upgraded.migrate().migrationsExecuted);
    }

    @Test void checkInStateCyclesDoNotCreateXpAndKeepOriginalPoints() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        rewards.addXp(user, 100);
        long habitId = createHabit(token);
        checkIn(token, habitId, "COMPLETED", "First");
        int first = rewards.getUserProgress(user).totalXp();
        accountingDb.update("update habit set points = 99 where id = ?", habitId);
        for (int i = 0; i < 3; i++) {
            checkIn(token, habitId, "SKIPPED", "Undo");
            org.junit.jupiter.api.Assertions.assertEquals(first - 10, rewards.getUserProgress(user).totalXp());
            checkIn(token, habitId, "FAILED", "Fail");
            org.junit.jupiter.api.Assertions.assertEquals(first - 15, rewards.getUserProgress(user).totalXp());
            checkIn(token, habitId, "COMPLETED", "Restore");
            org.junit.jupiter.api.Assertions.assertEquals(first, rewards.getUserProgress(user).totalXp());
        }
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].scoreImpact").value(10));
        mvc.perform(get("/api/penalties/summary").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.totalPenalties").value(0))
                .andExpect(jsonPath("$.totalXpDeducted").value(0));
        org.junit.jupiter.api.Assertions.assertEquals(10, accountingDb.queryForObject(
                "select sum(a.delta) from check_in_xp_adjustment a join daily_check_in c on c.id = a.check_in_id where c.habit_id = ?",
                Integer.class, habitId));
    }

    @Test void undoFailureRefundsOnlyActualDeduction() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        long habitId = createHabit(token);
        rewards.addXp(user, 2);
        checkIn(token, habitId, "FAILED", "Fail with only 2 XP");
        org.junit.jupiter.api.Assertions.assertEquals(0, rewards.getUserProgress(user).totalXp());
        mvc.perform(get("/api/penalties/summary").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.totalXpDeducted").value(2));
        checkIn(token, habitId, "SKIPPED", "Undo");
        org.junit.jupiter.api.Assertions.assertEquals(2, rewards.getUserProgress(user).totalXp());
    }

    @Test void cannotUndoCompletionAfterSpendingItsXp() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        long habitId = createHabit(token);
        checkIn(token, habitId, "COMPLETED", "Original");
        rewards.deductXp(user, rewards.getUserProgress(user).totalXp());
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habitId, "status", "SKIPPED", "note", "Changed"))))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$[0].note").value("Original"));
        org.junit.jupiter.api.Assertions.assertEquals(0, rewards.getUserProgress(user).totalXp());
    }

    @Test void legacyCheckInAllowsNotesButRefusesUnverifiableXpChanges() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long habitId = createHabit(token);
        accountingDb.update("insert into daily_check_in (habit_id, check_date, status, note) values (?, ?, 'COMPLETED', 'Legacy')",
                habitId, java.time.LocalDate.now());
        checkIn(token, habitId, "COMPLETED", "Updated note");
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habitId, "status", "SKIPPED"))))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$[0].note").value("Updated note"));
    }

    private long createHabit(String token) throws Exception {
        String body = mvc.perform(post("/api/habits").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Read\",\"difficulty\":\"MEDIUM\",\"targetPerWeek\":5}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private void checkIn(String token, long habitId, String state, String note) throws Exception {
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habitId, "status", state, "note", note))))
                .andExpect(status().isCreated());
    }


    @Test void historicalCheckInCorrectionsStayOnSelectedDayAndAccount() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        String other = register(UUID.randomUUID() + "@example.com");
        var user = users.findByEmail(email).orElseThrow();
        long habit = createHabit(token);
        checkIn(token, habit, "COMPLETED", "Today stays unchanged");
        var todayResponse = mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        String today = json.readTree(todayResponse.getResponse().getContentAsString()).get(0).get("date").asText();
        String past = java.time.LocalDate.parse(today).minusDays(2).toString();
        for (String state : java.util.List.of("COMPLETED", "SKIPPED", "COMPLETED")) {
            mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                            "habitId", habit, "date", past, "status", state, "note", "Past note"))))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.date").value(past));
        }
        int xp = rewards.getUserProgress(user).totalXp();
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "date", past, "status", "COMPLETED", "note", "Corrected past note"))))
                .andExpect(status().isCreated());
        org.junit.jupiter.api.Assertions.assertEquals(xp, rewards.getUserProgress(user).totalXp());
        mvc.perform(get("/api/check-ins").param("date", today).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$[0].note").value("Today stays unchanged"));
        mvc.perform(get("/api/check-ins").param("date", past).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].note").value("Corrected past note"));
        mvc.perform(get("/api/check-ins").param("date", past).header("Authorization", "Bearer " + other))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test void repeatedCompletionUpdatesNoteWithoutGrantingMoreXp() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        long habitId = createHabit(token);
        checkIn(token, habitId, "COMPLETED", "First");
        int earned = rewards.getUserProgress(user).totalXp();
        org.junit.jupiter.api.Assertions.assertTrue(earned > 0);
        for (int i = 0; i < 10; i++) checkIn(token, habitId, "COMPLETED", "Updated");
        org.junit.jupiter.api.Assertions.assertEquals(earned, rewards.getUserProgress(user).totalXp());
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].note").value("Updated"));
    }

    @Test void repeatedFailureDoesNotRepeatPenalty() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        rewards.addXp(user, 100);
        long habitId = createHabit(token);
        checkIn(token, habitId, "FAILED", "First");
        int remaining = rewards.getUserProgress(user).totalXp();
        org.junit.jupiter.api.Assertions.assertTrue(remaining < 100);
        for (int i = 0; i < 10; i++) checkIn(token, habitId, "FAILED", "Updated");
        org.junit.jupiter.api.Assertions.assertEquals(remaining, rewards.getUserProgress(user).totalXp());
        mvc.perform(get("/api/penalties").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test void concurrentDuplicateCheckInsGrantOneReward() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        long habitId = createHabit(token);
        // First completion establishes achievement bonuses independently of the contested habit.
        checkIn(token, habitId, "COMPLETED", "First");
        int before = rewards.getUserProgress(user).totalXp();
        long secondHabit = createHabit(token);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Void>>();
            for (int i = 0; i < 4; i++) futures.add(executor.submit(() -> {
                start.await();
                checkIn(token, secondHabit, "COMPLETED", "Concurrent");
                return null;
            }));
            start.countDown();
            for (var future : futures) future.get(30, java.util.concurrent.TimeUnit.SECONDS);
        }
        int points = com.selfforge.discipline.habit.Difficulty.MEDIUM.defaultPoints();
        org.junit.jupiter.api.Assertions.assertEquals(before + points, rewards.getUserProgress(user).totalXp());
    }

    @Test void pomodoroStartRetriesReuseSessionAndRejectChangedPayload() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String key = UUID.randomUUID().toString();
        String payload = json.writeValueAsString(java.util.Map.of("durationMinutes", 25, "requestId", key));
        long firstId = 0;
        for (int i = 0; i < 3; i++) {
            String body = mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated())
                    .andReturn().getResponse().getContentAsString();
            long id = json.readTree(body).get("id").asLong();
            if (i == 0) firstId = id;
            org.junit.jupiter.api.Assertions.assertEquals(firstId, id);
        }
        mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of("durationMinutes", 30, "requestId", key))))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(1, accountingDb.queryForObject("select count(*) from pomodoro_session where start_request_id = ?", Integer.class, key));
    }

    @Test void concurrentPomodoroStartsShareOneSessionAndSeparateAccounts() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String other = register(UUID.randomUUID() + "@example.com");
        String key = UUID.randomUUID().toString();
        String payload = json.writeValueAsString(java.util.Map.of("durationMinutes", 25, "requestId", key));
        var ids = new java.util.HashSet<Long>();
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(6)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Long>>();
            for (int i = 0; i < 6; i++) futures.add(executor.submit(() -> {
                if (!start.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Start timeout");
                String body = mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated())
                        .andReturn().getResponse().getContentAsString();
                return json.readTree(body).get("id").asLong();
            }));
            start.countDown();
            for (var future : futures) ids.add(future.get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
        org.junit.jupiter.api.Assertions.assertEquals(1, ids.size());
        org.junit.jupiter.api.Assertions.assertEquals(1, accountingDb.queryForObject("select count(*) from pomodoro_session where start_request_id = ?", Integer.class, key));
        String body = mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(ids.contains(json.readTree(body).get("id").asLong()));
    }
    @Test void challengeTextLimitsRejectOversizedInputAndAcceptBoundary() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habitId = createHabit(token);
        for (String field : java.util.List.of("name", "description")) {
            var body = new java.util.HashMap<String, Object>();
            body.put("habitId", habitId);
            body.put("name", "Challenge");
            body.put("targetDays", 7);
            body.put(field, "x".repeat(256));
            mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of(
                        "habitId", habitId, "name", "x".repeat(255), "description", "y".repeat(255), "targetDays", 7))))
                .andExpect(status().isCreated());
    }
    @Test void challengeCreateReplayIsConcurrentSafeAndDoesNotResurrectDeletedResource() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habitId = createHabit(token);
        String key = UUID.randomUUID().toString();
        var payload = new java.util.HashMap<String, Object>();
        payload.put("habitId", habitId); payload.put("name", "Read"); payload.put("description", "Daily");
        payload.put("targetDays", 7); payload.put("requestId", key);
        String body = json.writeValueAsString(payload);
        var ids = new java.util.HashSet<Long>();
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Long>>();
            for (int i = 0; i < 4; i++) futures.add(executor.submit(() -> {
                if (!start.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Timeout");
                String result = mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated())
                        .andReturn().getResponse().getContentAsString();
                return json.readTree(result).get("id").asLong();
            }));
            start.countDown();
            for (var future : futures) ids.add(future.get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
        org.junit.jupiter.api.Assertions.assertEquals(1, ids.size());
        long id = ids.iterator().next();
        org.junit.jupiter.api.Assertions.assertEquals(1, accountingDb.queryForObject("select count(*) from challenge_create_receipt where request_id = ?", Integer.class, key));
        payload.put("name", "Changed");
        mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isConflict());
        // Replay still resolves the saved record when the business date has changed.
        accountingDb.update("update challenge set start_date = ? where id = ?", java.sql.Date.valueOf("2020-01-01"), id);
        mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
        mvc.perform(delete("/api/challenges/" + id).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject("select count(*) from challenge where id = ?", Integer.class, id));
        String other = register(UUID.randomUUID() + "@example.com");
        payload.put("habitId", createHabit(other));
        mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isCreated());
    }
    @Test void stoppingChallengePreservesCheckInsAndAccountOwnership() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String other = register(UUID.randomUUID() + "@example.com");
        long habitId = createHabit(token);
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of(
                        "habitId", habitId, "status", "COMPLETED")))).andExpect(status().isCreated());
        String body = mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of(
                        "habitId", habitId, "name", "Keep history", "targetDays", 7))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(patch("/api/challenges/" + id + "/status").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ABANDONED\"}"))
                .andExpect(status().isNotFound());
        for (int i = 0; i < 2; i++) mvc.perform(patch("/api/challenges/" + id + "/status").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ABANDONED\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ABANDONED"));
        mvc.perform(get("/api/challenges/" + id + "/progress").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.completedDays").value(1));
        mvc.perform(get("/api/check-ins").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("COMPLETED"));
    }
    @Test void challengeDeleteRetriesAreNoOpsAndCannotDeleteOtherAccounts() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String other = register(UUID.randomUUID() + "@example.com");
        long habitId = createHabit(token);
        String body = mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of(
                        "habitId", habitId, "name", "Delete safely", "targetDays", 7))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(delete("/api/challenges/" + id)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/challenges/" + id).header("Authorization", "Bearer " + other)).andExpect(status().isNoContent());
        mvc.perform(get("/api/challenges/" + id + "/progress").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (int i = 0; i < 4; i++) futures.add(executor.submit(() -> {
                if (!start.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Timeout");
                return mvc.perform(delete("/api/challenges/" + id).header("Authorization", "Bearer " + token))
                        .andReturn().getResponse().getStatus();
            }));
            start.countDown();
            for (var future : futures) org.junit.jupiter.api.Assertions.assertEquals(204, future.get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
        mvc.perform(delete("/api/challenges/" + id).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/challenges/" + id + "/progress").header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject("select count(*) from challenge where id = ?", Integer.class, id));
    }
    @Test void concurrentReminderEditsPreserveIndependentFieldsAndOwnership() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String other = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        String created = mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "reminderTime", "07:00", "daysOfWeek", "MON", "message", "original"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(created).get("id").asLong();
        mvc.perform(patch("/api/reminders/" + id).header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isNotFound());
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (String body : java.util.List.of("{\"reminderTime\":\"09:30\",\"daysOfWeek\":\"TUE,THU\",\"message\":\"\"}", "{\"enabled\":false}")) {
                futures.add(executor.submit(() -> {
                    if (!start.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Timeout");
                    return mvc.perform(patch("/api/reminders/" + id).header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();
            for (var future : futures) org.junit.jupiter.api.Assertions.assertEquals(200, future.get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
        mvc.perform(get("/api/reminders").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].reminderTime").value("09:30:00"))
                .andExpect(jsonPath("$[0].daysOfWeek").value("TUE,THU"))
                .andExpect(jsonPath("$[0].message").value(""))
                .andExpect(jsonPath("$[0].enabled").value(false));
    }

    @Test void inactiveHabitRemindersPauseAndResumeWithoutLosingTheirSchedule() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long habit = createHabit(token);
        var user = users.findByEmail(email).orElse(null);
        // The helper account's current date is authoritative; avoid a test that accidentally fails every weekend.
        if (user == null) throw new AssertionError("Expected registered reminder user");
        var now = userTime.now(user);
        String todaySchedule = now.getDayOfWeek().name().substring(0, 3);
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "targetPerWeek", 1, "scheduledDays", todaySchedule))))
                .andExpect(status().isOk());
        var reminderTime = now.toLocalTime().withSecond(0).withNano(0);
        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                    "habitId", habit, "reminderTime", reminderTime.toString(), "daysOfWeek", todaySchedule, "message", "Keep this schedule"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.habitActive").value(true));
        mvc.perform(get("/api/reminders/due").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(delete("/api/habits/" + habit).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/reminders").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].enabled").value(true))
                .andExpect(jsonPath("$[0].habitActive").value(false)).andExpect(jsonPath("$[0].habitScheduledDays").value(todaySchedule))
                .andExpect(jsonPath("$[0].message").value("Keep this schedule"));
        mvc.perform(get("/api/reminders/due").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/reminders/due").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].habitActive").value(true));
    }

    @Test void dueRemindersNeverIgnoreTheHabitSchedule() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        var now = userTime.now(user);
        String reminderDay = now.getDayOfWeek().name().substring(0, 3);
        String habitRestDay = now.toLocalDate().plusDays(1).getDayOfWeek().name().substring(0, 3);
        String created = mvc.perform(post("/api/habits").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "name", "Scheduled rest reminder", "targetPerWeek", 1, "scheduledDays", reminderDay))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long habit = json.readTree(created).get("id").asLong();
        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "reminderTime", now.toLocalTime().withSecond(0).withNano(0).toString(),
                        "daysOfWeek", reminderDay, "message", "Should stay quiet"))))
                .andExpect(status().isCreated());
        mvc.perform(patch("/api/habits/" + habit).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "targetPerWeek", 1, "scheduledDays", habitRestDay))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/reminders/due").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test void reminderWeekdaysMustBelongToTheHabitSchedule() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String created = mvc.perform(post("/api/habits").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "name", "Only Mondays", "targetPerWeek", 1, "scheduledDays", "MON"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long habit = json.readTree(created).get("id").asLong();

        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "reminderTime", "09:00", "daysOfWeek", "TUE"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Lịch nhắc chỉ có thể đặt vào ngày thực hiện của thói quen."));
        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "reminderTime", "09:00", "daysOfWeek", "MON,MON"))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "reminderTime", "09:00"))))
                .andExpect(status().isBadRequest());

        String reminder = mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "habitId", habit, "reminderTime", "09:00", "daysOfWeek", "MON"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long reminderId = json.readTree(reminder).get("id").asLong();
        mvc.perform(patch("/api/reminders/" + reminderId).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"daysOfWeek\":\"TUE\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/reminders/" + reminderId).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(false));
    }

    @Test void profileSnapshotsPreventOverwritingAnotherSessionsChanges() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        var original = json.readTree(mvc.perform(get("/api/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var latest = json.readTree(mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("displayName", "New profile", "timezone", "Europe/Paris", "motto", "New motto", "expected", original))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("displayName", "Stale profile", "expected", original)))).andExpect(status().isConflict());
        mvc.perform(get("/api/profile").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("New profile")).andExpect(jsonPath("$.timezone").value("Europe/Paris"));
        mvc.perform(patch("/api/profile").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("displayName", "Reviewed update", "expected", latest)))).andExpect(status().isOk())
                .andExpect(jsonPath("$.motto").value("New motto"));
    }

    @Test void journalSnapshotsPreventConcurrentCreationAndStaleOverwrite() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        String body = "{\"win\":\"Original\",\"expected\":{\"id\":null}}";
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var results = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (int i = 0; i < 2; i++) results.add(executor.submit(() -> {
                if (!start.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Timeout");
                return mvc.perform(post("/api/journal").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().getResponse().getStatus();
            }));
            start.countDown();
            var statuses = new java.util.ArrayList<Integer>();
            for (var result : results) statuses.add(result.get(30, java.util.concurrent.TimeUnit.SECONDS));
            java.util.Collections.sort(statuses);
            org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(201, 409), statuses);
        }
        var original = json.readTree(mvc.perform(get("/api/journal").header("Authorization", "Bearer " + token)).andReturn().getResponse().getContentAsString());
        mvc.perform(post("/api/journal").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("win", "New version", "expected", original)))).andExpect(status().isCreated());
        mvc.perform(post("/api/journal").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("win", "Stale overwrite", "expected", original)))).andExpect(status().isConflict());
        mvc.perform(get("/api/journal").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.win").value("New version"));
    }

    @Test void weeklyReviewSnapshotsPreventStaleOverwriteAndAcceptLatestBase() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null); users.save(user);
        var original = json.readTree(mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"wins\":\"Original\",\"rating\":3,\"expected\":{\"id\":null}}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        var latest = json.readTree(mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("wins", "New version", "rating", 4, "expected", original))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("wins", "Stale overwrite", "rating", 5, "expected", original)))).andExpect(status().isConflict());
        mvc.perform(get("/api/weekly-review/current").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andExpect(jsonPath("$.wins").value("New version"));
        mvc.perform(post("/api/weekly-review").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("wins", "Reviewed update", "rating", 5, "expected", latest)))).andExpect(status().isCreated());
    }

    @Test void reminderCreationRetriesAreIdempotentAndCannotRecreateDeletedReminders() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        String body = json.writeValueAsString(Map.of("habitId", habit, "reminderTime", "07:00", "daysOfWeek", "MON", "message", "Read", "requestId", UUID.randomUUID().toString()));
        long id;
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Long>>();
            for (int i = 0; i < 2; i++) futures.add(executor.submit(() -> {
                if (!start.await(15, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Timeout");
                String response = mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body))
                        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
                return json.readTree(response).get("id").asLong();
            }));
            start.countDown();
            id = futures.getFirst().get(30, java.util.concurrent.TimeUnit.SECONDS);
            org.junit.jupiter.api.Assertions.assertEquals(id, futures.getLast().get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
        mvc.perform(get("/api/reminders").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body.replace("Read", "Changed")))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/reminders/" + id).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/reminders").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(0));
    }

    @Test void remindersRejectInvalidSchedulesAndOversizedMessages() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        for (String days : java.util.List.of("", "MONDAY", "MON,", "MON,BOGUS")) {
            mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of(
                            "habitId", habit, "reminderTime", "07:00", "daysOfWeek", days))))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of(
                        "habitId", habit, "reminderTime", "07:00", "message", "x".repeat(256)))))
                .andExpect(status().isBadRequest());
        String body = mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of(
                        "habitId", habit, "reminderTime", "07:00", "daysOfWeek", "MON,WED,FRI"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(patch("/api/reminders/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of("daysOfWeek", ""))))
                .andExpect(status().isBadRequest());
    }
    @Test void csvExportNeutralizesUserTextAndUsesExactlyNinetyDates() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        long habitId = createHabit(token);
        accountingDb.update("update habit set name = ? where id = ?", "=1+1", habitId);
        checkIn(token, habitId, "COMPLETED", "OUTSIDE_EXPORT_WINDOW");
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        accountingDb.update("update daily_check_in set check_date = ? where habit_id = ?", java.sql.Date.valueOf(today.minusDays(90)), habitId);
        String csv = mvc.perform(get("/api/export/csv").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        org.junit.jupiter.api.Assertions.assertTrue(csv.contains("\"'=1+1\""));
        org.junit.jupiter.api.Assertions.assertFalse(csv.contains("OUTSIDE_EXPORT_WINDOW"));
        accountingDb.update("update daily_check_in set check_date = ? where habit_id = ?", java.sql.Date.valueOf(today.minusDays(89)), habitId);
        String boundary = mvc.perform(get("/api/export/csv").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        org.junit.jupiter.api.Assertions.assertTrue(boundary.contains("OUTSIDE_EXPORT_WINDOW"));
    }
    @Test void moodDeletionProtectsChangedRecreatedAndOtherAccountRecords() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var date=userTime.today(users.findByEmail(email).orElseThrow()).minusDays(1);
        String body=mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"score",3,"emoji","neutral","note","Original")))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();long id=json.readTree(body).get("id").asLong();var snapshot=Map.of("id",id,"score",3,"emoji","neutral","note","Original");var request=Map.of("date",date.toString(),"expected",snapshot);
        mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"score",4,"note","Updated")))).andExpect(status().isOk());mvc.perform(delete("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request))).andExpect(status().isConflict());var confirmed=Map.of("date",date.toString(),"expected",Map.of("id",id,"score",4,"emoji","neutral","note","Updated"));
        for(int n=0;n<2;n++)mvc.perform(delete("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(confirmed))).andExpect(status().isNoContent());
        mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"score",2)))).andExpect(status().isOk());mvc.perform(delete("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(confirmed))).andExpect(status().isConflict());
        mvc.perform(post("/api/mood").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"score",5)))).andExpect(status().isOk());mvc.perform(delete("/api/mood").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(confirmed))).andExpect(status().isConflict());mvc.perform(get("/api/mood").param("date",date.toString()).header("Authorization","Bearer "+other)).andExpect(jsonPath("$.score").value(5));
        mvc.perform(delete("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString())))).andExpect(status().isBadRequest());mvc.perform(delete("/api/mood").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(confirmed))).andExpect(status().isUnauthorized());
    }

    @Test void moodEditingProtectsConcurrentChangesAndSupportsExactRetries() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var today=userTime.today(users.findByEmail(email).orElseThrow());var date=today.minusDays(2);
        String original=mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"score",3,"emoji","neutral","note","Original")))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();var saved=json.readTree(original);var expected=Map.of("id",saved.get("id").asLong(),"score",3,"emoji","neutral","note","Original");var change=Map.of("date",date.toString(),"score",4,"emoji","happy","note","Changed","expected",expected);
        mvc.perform(get("/api/mood").param("date",date.toString()).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.note").value("Original"));
        for(int n=0;n<2;n++)mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(change))).andExpect(status().isOk()).andExpect(jsonPath("$.note").value("Changed"));
        mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"score",2,"note","Stale","expected",expected)))).andExpect(status().isConflict());
        mvc.perform(post("/api/mood").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(change))).andExpect(status().isConflict());
        mvc.perform(get("/api/mood").param("date",today.plusDays(1).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",today.plusDays(1).toString(),"score",3)))).andExpect(status().isBadRequest());
    }

    @Test void monthlyMoodIsOwnedBoundedAndOmitsPrivateNotes() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var today=userTime.today(users.findByEmail(email).orElseThrow());var month=java.time.YearMonth.from(today).minusMonths(1);
        for(int day:java.util.List.of(1,3))mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",month.atDay(day).toString(),"score",day==1?2:4,"note","PRIVATE")))).andExpect(status().isOk());
        mvc.perform(post("/api/mood").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",month.minusMonths(1).atEndOfMonth().toString(),"score",1)))).andExpect(status().isOk());
        mvc.perform(get("/api/mood/monthly").param("month",month.toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.observedThrough").value(month.atEndOfMonth().toString())).andExpect(jsonPath("$.entries.length()").value(2)).andExpect(jsonPath("$.entries[0].score").value(2)).andExpect(jsonPath("$.entries[0].note").doesNotExist());
        mvc.perform(get("/api/mood/monthly").param("month",month.toString()).header("Authorization","Bearer "+other)).andExpect(jsonPath("$.entries.length()").value(0));mvc.perform(get("/api/mood/monthly").param("month",month.plusMonths(2).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/mood/monthly").param("month",month.minusMonths(24).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/mood/monthly")).andExpect(status().isUnauthorized());
    }

    @Test void monthlyActivityUsesOwnedRecordedDaysAndCalendarBoundariesWithoutEstimatedTargets() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var user=users.findByEmail(email).orElseThrow();var month=java.time.YearMonth.from(userTime.today(user)).minusMonths(1);long habit=createHabit(token);
        for(int i=1;i<=2;i++)mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",month.atDay(i).toString(),"status",i==1?"COMPLETED":"SKIPPED")))).andExpect(status().isCreated());
        var start=userTime.day(user,month.atDay(1)).start();var next=userTime.day(user,month.plusMonths(1).atDay(1)).start();
        for(int i=0;i<4;i++){
            String body=mvc.perform(post("/api/pomodoro/start").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"durationMinutes",25,"requestId",UUID.randomUUID().toString())))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(body).get("id").asLong();var instant=i==1?start.minusSeconds(1):i==2?next:start;accountingDb.update("update pomodoro_session set started_at=?, ended_at=?, completed=?, note=? where id=?",java.sql.Timestamp.from(instant),java.sql.Timestamp.from(instant.plusSeconds(1500)),i!=3,"PRIVATE",id);
        }
        String free=mvc.perform(post("/api/pomodoro/start").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("durationMinutes",45,"requestId",UUID.randomUUID().toString())))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long freeId=json.readTree(free).get("id").asLong();accountingDb.update("update pomodoro_session set started_at=?, ended_at=?, completed=true where id=?",java.sql.Timestamp.from(start),java.sql.Timestamp.from(start.plusSeconds(2700)),freeId);accountingDb.update("update habit set active=false where id=?",habit);
        mvc.perform(get("/api/stats/activity/monthly").param("month",month.toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(1)).andExpect(jsonPath("$.skipped").value(1)).andExpect(jsonPath("$.failed").value(0)).andExpect(jsonPath("$.focusSessions").value(2)).andExpect(jsonPath("$.focusMinutes").value(70)).andExpect(jsonPath("$.recordedDays").value(2)).andExpect(jsonPath("$.days.length()").value(month.lengthOfMonth())).andExpect(jsonPath("$.days[0].focusMinutes").value(70)).andExpect(jsonPath("$.completionRate").doesNotExist()).andExpect(jsonPath("$.unlinkedFocusMinutes").value(45)).andExpect(jsonPath("$.habits.length()").value(1)).andExpect(jsonPath("$.habits[0].habitId").value(habit)).andExpect(jsonPath("$.habits[0].active").value(false)).andExpect(jsonPath("$.habits[0].focusMinutes").value(25));
        mvc.perform(get("/api/stats/activity/monthly").param("month",month.toString()).header("Authorization","Bearer "+other)).andExpect(jsonPath("$.recordedDays").value(0));
        mvc.perform(get("/api/stats/activity/monthly").param("month",month.plusMonths(2).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/stats/activity/monthly").param("month",month.minusMonths(24).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/stats/activity/monthly")).andExpect(status().isUnauthorized());
    }

    @Test void journalDeletionRequiresExactSavedSnapshotAndProtectsRecreatedOrForeignEntries() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var date=userTime.today(users.findByEmail(email).orElseThrow());
        java.util.function.Function<com.fasterxml.jackson.databind.JsonNode,java.util.Map<String,Object>> snapshot=node->Map.of("id",node.path("id").asLong(),"win",node.path("win").asText(""),"obstacle",node.path("obstacle").asText(""),"lesson",node.path("lesson").asText(""),"tomorrowFocus",node.path("tomorrowFocus").asText(""));
        String initial=mvc.perform(post("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"win","Original")))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();var original=Map.of("date",date.toString(),"expected",snapshot.apply(json.readTree(initial)));
        String changed=mvc.perform(post("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"win","Changed elsewhere")))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(delete("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(original))).andExpect(status().isConflict());var confirmed=Map.of("date",date.toString(),"expected",snapshot.apply(json.readTree(changed)));
        for(int n=0;n<2;n++)mvc.perform(delete("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(confirmed))).andExpect(status().isNoContent());mvc.perform(get("/api/journal").param("date",date.toString()).header("Authorization","Bearer "+token)).andExpect(status().isNotFound());
        mvc.perform(post("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"win","Recreated")))).andExpect(status().isCreated());mvc.perform(delete("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(confirmed))).andExpect(status().isConflict());
        mvc.perform(post("/api/journal").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString(),"win","Other account")))).andExpect(status().isCreated());mvc.perform(delete("/api/journal").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(confirmed))).andExpect(status().isConflict());mvc.perform(get("/api/journal").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.win").value("Other account"));
        mvc.perform(delete("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",date.toString())))).andExpect(status().isBadRequest());mvc.perform(delete("/api/journal").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(confirmed))).andExpect(status().isUnauthorized());
    }

    @Test void journalSearchIsLiteralScopedPaginatedAndDoesNotExposeWholeEntries() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var today=userTime.today(users.findByEmail(email).orElseThrow());
        for(int i=0;i<23;i++)mvc.perform(post("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",today.minusDays(i).toString(),"win",i==22?"Needle plain":"prefix %_ NeEdLe "+"x".repeat(250),"obstacle","PRIVATE OBSTACLE")))).andExpect(status().isCreated());
        mvc.perform(post("/api/journal").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",today.toString(),"win","foreign needle")))).andExpect(status().isCreated());
        String result=mvc.perform(get("/api/journal/search").param("q","needle").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(20)).andExpect(jsonPath("$.nextCursor").value(today.minusDays(19).toString())).andExpect(jsonPath("$.items[0].field").value("win")).andExpect(jsonPath("$.items[0].obstacle").doesNotExist()).andReturn().getResponse().getContentAsString();org.junit.jupiter.api.Assertions.assertTrue(json.readTree(result).get("items").get(0).get("excerpt").asText().length()<=180);org.junit.jupiter.api.Assertions.assertFalse(result.contains("PRIVATE OBSTACLE"));
        mvc.perform(get("/api/journal/search").param("q","needle").param("before",today.minusDays(19).toString()).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(3)).andExpect(jsonPath("$.nextCursor").isEmpty());
        mvc.perform(get("/api/journal/search").param("q","%_").param("before",today.minusDays(19).toString()).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(2));
        mvc.perform(get("/api/journal/search").param("q","needle").param("field","lesson").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/journal/search").param("q","needle").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(get("/api/journal/search").param("q","needle").param("fromDate",today.minusDays(9).toString()).param("toDate",today.minusDays(7).toString()).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(3)).andExpect(jsonPath("$.fromDate").value(today.minusDays(9).toString()));
        mvc.perform(get("/api/journal/search").param("q","needle").param("fromDate",today.toString()).param("toDate",today.minusDays(1).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/journal/search").param("q"," ").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/journal/search").param("q","needle").param("field","email").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/journal/search").param("q","needle")).andExpect(status().isUnauthorized());
    }

    @Test void todayFocusEvidenceIsScopedToOwnerCalendarAndOmitsPrivateNotes() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var user=users.findByEmail(email).orElseThrow();long habit=createHabit(token);var date=userTime.today(user);var window=userTime.day(user,date);
        long included=0;
        for(int index=0;index<4;index++){
            String body=mvc.perform(post("/api/pomodoro/start").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"durationMinutes",25,"requestId",UUID.randomUUID().toString())))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(body).get("id").asLong();
            var start=index==1?window.start().minusSeconds(1):index==2?window.end():window.start();
            accountingDb.update("update pomodoro_session set started_at=?, ended_at=?, completed=?, note=? where id=?",java.sql.Timestamp.from(start),java.sql.Timestamp.from(start.plusSeconds(1500)),index!=3,"PRIVATE NOTE",id);if(index==0)included=id;
        }
        mvc.perform(get("/api/pomodoro/today/evidence").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.date").value(date.toString())).andExpect(jsonPath("$.sessions.length()").value(1)).andExpect(jsonPath("$.sessions[0].id").value(included)).andExpect(jsonPath("$.sessions[0].habitId").value(habit)).andExpect(jsonPath("$.sessions[0].note").doesNotExist());
        mvc.perform(get("/api/pomodoro/day/evidence").param("date",date.minusDays(1).toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.date").value(date.minusDays(1).toString())).andExpect(jsonPath("$.sessions.length()").value(1));
        mvc.perform(get("/api/pomodoro/day/evidence").param("date",date.plusDays(1).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/pomodoro/today/evidence").header("Authorization","Bearer "+other)).andExpect(status().isOk()).andExpect(jsonPath("$.sessions.length()").value(0));mvc.perform(get("/api/pomodoro/today/evidence")).andExpect(status().isUnauthorized());
    }

    @Test void repeatedPomodoroCompletionKeepsOriginalResultAndXp() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        String body = mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":25}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        accountingDb.update("update pomodoro_session set started_at = ? where id = ?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(1501)), id);
        mvc.perform(post("/api/pomodoro/" + id + "/complete")
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"Done\"}"))
                .andExpect(status().isOk());
        // Compare persisted timestamps: SQL stores microseconds, Java Instant may have nanoseconds.
        String recent = mvc.perform(get("/api/pomodoro/recent").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String completed = json.readTree(recent).get(0).toString();
        mvc.perform(post("/api/pomodoro/" + id + "/complete").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(content().json(completed));
        org.junit.jupiter.api.Assertions.assertEquals(5, rewards.getUserProgress(user).totalXp());
    }

    @Test void pomodoroRejectsInvalidDurationEarlyCompletionAndOtherUser() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        String other = register(UUID.randomUUID() + "@example.com");
        for (int duration : new int[]{-1, 0, 1, 24, 121, Integer.MAX_VALUE}) {
            mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"durationMinutes\":" + duration + "}"))
                    .andExpect(status().isBadRequest());
        }
        String body = mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.durationMinutes").value(25))
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(post("/api/pomodoro/" + id + "/complete").header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/pomodoro/" + id + "/complete").header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/pomodoro/" + id + "/complete").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("note", "x".repeat(256)))))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/pomodoro/recent").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].completed").value(false));
        org.junit.jupiter.api.Assertions.assertEquals(0, rewards.getUserProgress(users.findByEmail(email).orElseThrow()).totalXp());
    }

    @Test void overlappingPomodorosCompletedConcurrentlyAwardOnlyOnce() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var ids = new java.util.ArrayList<Long>();
        for (int i = 0; i < 2; i++) {
            String body = mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
            ids.add(json.readTree(body).get("id").asLong());
        }
        for (Long id : ids) accountingDb.update("update pomodoro_session set started_at = ? where id = ?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(1501)), id);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (Long id : ids) futures.add(executor.submit(() -> {
                start.await();
                return mvc.perform(post("/api/pomodoro/" + id + "/complete").header("Authorization", "Bearer " + token))
                        .andReturn().getResponse().getStatus();
            }));
            start.countDown();
            var statuses = new java.util.ArrayList<Integer>();
            for (var future : futures) statuses.add(future.get(30, java.util.concurrent.TimeUnit.SECONDS));
            java.util.Collections.sort(statuses);
            org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200, 409), statuses);
        }
        org.junit.jupiter.api.Assertions.assertEquals(5, rewards.getUserProgress(users.findByEmail(email).orElseThrow()).totalXp());
    }

    @Test void companionWeekUsesOwnedCurrentCheckInPointsAndReflectsCorrections() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var user=users.findByEmail(email).orElseThrow();var today=userTime.today(user);var week=today.with(java.time.DayOfWeek.MONDAY);long habit=createHabit(token),foreign=createHabit(other);
        for(var item:java.util.List.of(Map.entry(token,habit),Map.entry(other,foreign)))mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+item.getKey()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",item.getValue(),"date",today.toString(),"status","COMPLETED","note","PRIVATE")))).andExpect(status().isCreated());
        int points=accountingDb.queryForObject("select points_snapshot from daily_check_in where habit_id=? and check_date=?",Integer.class,habit,today);
        mvc.perform(get("/api/companion/weekly").param("week",week.toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.xp").value(points)).andExpect(jsonPath("$.counted").value(1)).andExpect(jsonPath("$.sources.length()").value(1)).andExpect(jsonPath("$.sources[0].habitId").value(habit)).andExpect(jsonPath("$.sources[0].note").doesNotExist());
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.toString(),"status","SKIPPED")))).andExpect(status().isCreated());
        mvc.perform(get("/api/companion/weekly").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(0)).andExpect(jsonPath("$.sources.length()").value(0));
        mvc.perform(get("/api/companion/weekly").param("week",week.plusDays(1).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/companion/weekly")).andExpect(status().isUnauthorized());
    }

    @Test void companionRhythmUsesOwnedRecordedCreditsWithoutCreatingPressureOrProgress() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var user=users.findByEmail(email).orElseThrow();var today=userTime.today(user);long habit=createHabit(token),foreign=createHabit(other);
        for(var date:java.util.List.of(today.minusDays(7),today))mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",date.toString(),"status","COMPLETED","note","PRIVATE")))).andExpect(status().isCreated());
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",foreign,"date",today.toString(),"status","COMPLETED","note","FOREIGN")))).andExpect(status().isCreated());
        mvc.perform(get("/api/companion/rhythm").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.windowStart").value(today.minusDays(27).toString())).andExpect(jsonPath("$.observedThrough").value(today.toString())).andExpect(jsonPath("$.timezone").value(userTime.zone(user).getId()))
                .andExpect(jsonPath("$.periodDays").value(28)).andExpect(jsonPath("$.periodXp").value(20)).andExpect(jsonPath("$.contributingDays").value(2)).andExpect(jsonPath("$.companionXp").value(20)).andExpect(jsonPath("$.stage").value(1)).andExpect(jsonPath("$.nextThreshold").value(100)).andExpect(jsonPath("$.remainingXp").value(80)).andExpect(jsonPath("$.estimatedReachDate").value(today.plusDays(112).toString()))
                .andExpect(jsonPath("$.note").doesNotExist()).andExpect(jsonPath("$.habitName").doesNotExist());
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.minusDays(7).toString(),"status","SKIPPED","note","Corrected")))).andExpect(status().isCreated());
        mvc.perform(get("/api/companion/rhythm").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.periodXp").value(10)).andExpect(jsonPath("$.contributingDays").value(1)).andExpect(jsonPath("$.companionXp").value(10)).andExpect(jsonPath("$.remainingXp").value(90)).andExpect(jsonPath("$.estimatedReachDate").value(today.plusDays(252).toString()));
        mvc.perform(get("/api/companion/rhythm").header("Authorization","Bearer "+other)).andExpect(status().isOk()).andExpect(jsonPath("$.periodXp").value(10)).andExpect(jsonPath("$.companionXp").value(10));
        mvc.perform(get("/api/companion/rhythm")).andExpect(status().isUnauthorized());
    }

    @Test void rewardCreationRetrySurvivesEditsAndDeletion() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);
        var user=users.findByEmail(email).orElseThrow();user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME,null);users.save(user);
        String requestId=UUID.randomUUID().toString();var payload=new java.util.HashMap<String,Object>(Map.of("name","Break","description","Tea","xpCost",20,"requestId",requestId));
        String value=mvc.perform(post("/api/custom-rewards").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id=json.readTree(value).get("id").asLong();
        for(int retry=0;retry<2;retry++)mvc.perform(post("/api/custom-rewards").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        payload.put("name","Other");mvc.perform(post("/api/custom-rewards").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isConflict());payload.put("name","Break");
        mvc.perform(patch("/api/custom-rewards/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name","Movie","description","New","xpCost",30,"expected",Map.of("name","Break","description","Tea","xpCost",20))))).andExpect(status().isOk());
        mvc.perform(post("/api/custom-rewards").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Movie")).andExpect(jsonPath("$.id").value(id));
        mvc.perform(delete("/api/custom-rewards/"+id).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        mvc.perform(post("/api/custom-rewards").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isConflict());
        mvc.perform(get("/api/custom-rewards").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        String otherEmail=UUID.randomUUID()+"@example.com",otherToken=register(otherEmail);var other=users.findByEmail(otherEmail).orElseThrow();other.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME,null);users.save(other);
        mvc.perform(post("/api/custom-rewards").header("Authorization","Bearer "+otherToken).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isCreated());
        mvc.perform(delete("/api/profile/account").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword","password123","confirmationEmail",email)))).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from reward_create_receipt where user_id=?",Integer.class,user.getId()));
        org.junit.jupiter.api.Assertions.assertEquals(1,accountingDb.queryForObject("select count(*) from reward_create_receipt where user_id=?",Integer.class,other.getId()));
    }

    @Test void rewardEditsProtectConcurrentChangesAndClaimPrices() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);var user=users.findByEmail(email).orElseThrow();user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME,null);users.save(user);rewards.addXp(user,100);
        String value=mvc.perform(post("/api/custom-rewards").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Break\",\"description\":\"Old\",\"xpCost\":20}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(value).get("id").asLong();
        var expected=Map.of("name","Break","description","Old","xpCost",20);var edit=new java.util.HashMap<String,Object>(Map.of("name","Movie","description","New","xpCost",30,"expected",expected));
        for(int retry=0;retry<2;retry++)mvc.perform(patch("/api/custom-rewards/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(edit))).andExpect(status().isOk()).andExpect(jsonPath("$.xpCost").value(30));
        edit.put("name","Stale edit");mvc.perform(patch("/api/custom-rewards/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(edit))).andExpect(status().isConflict());
        mvc.perform(post("/api/custom-rewards/"+id+"/claim").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"expectedXpCost\":20}")).andExpect(status().isConflict());org.junit.jupiter.api.Assertions.assertEquals(100,rewards.getUserProgress(user).totalXp());
        for(var stale:List.of(Map.of("name","Old name","description","New","xpCost",30),Map.of("name","Movie","description","Old description","xpCost",30)))mvc.perform(post("/api/custom-rewards/"+id+"/claim").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("expectedXpCost",30,"expected",stale)))).andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(100,rewards.getUserProgress(user).totalXp());
        var reviewedClaim=Map.of("expectedXpCost",30,"expected",Map.of("name","Movie","description","New","xpCost",30));
        for(int retry=0;retry<2;retry++)mvc.perform(post("/api/custom-rewards/"+id+"/claim").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(reviewedClaim))).andExpect(status().isOk()).andExpect(jsonPath("$.claimed").value(true));
        org.junit.jupiter.api.Assertions.assertEquals(70,rewards.getUserProgress(user).totalXp());
        mvc.perform(post("/api/custom-rewards/"+id+"/claim").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"expectedXpCost\":30}")).andExpect(status().isOk());org.junit.jupiter.api.Assertions.assertEquals(70,rewards.getUserProgress(user).totalXp());
        mvc.perform(patch("/api/custom-rewards/"+id).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(edit))).andExpect(status().isConflict());
        String otherEmail=UUID.randomUUID()+"@example.com",otherToken=register(otherEmail);var other=users.findByEmail(otherEmail).orElseThrow();other.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME,null);users.save(other);
        mvc.perform(get("/api/custom-rewards/"+id).header("Authorization","Bearer "+otherToken)).andExpect(status().isNotFound());mvc.perform(patch("/api/custom-rewards/"+id).header("Authorization","Bearer "+otherToken).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(edit))).andExpect(status().isNotFound());
    }

    @Test void concurrentXpCreditsAndRewardClaimPreserveBalance() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        rewards.addXp(user, 100);
        String body = mvc.perform(post("/api/custom-rewards").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Break\",\"xpCost\":30}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Void>>();
            futures.add(executor.submit(() -> {
                start.await();
                mvc.perform(post("/api/custom-rewards/" + id + "/claim")
                        .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
                return null;
            }));
            for (int i = 0; i < 3; i++) futures.add(executor.submit(() -> {
                start.await();
                rewards.addXp(user, 10);
                return null;
            }));
            start.countDown();
            for (var future : futures) future.get(30, java.util.concurrent.TimeUnit.SECONDS);
        }
        org.junit.jupiter.api.Assertions.assertEquals(100, rewards.getUserProgress(user).totalXp());
    }

    @Test void rewardClaimRetryReturnsSavedResultWithoutAnotherDeduction() throws Exception {
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
                .andExpect(status().isOk()).andExpect(jsonPath("$.claimed").value(true));
        org.junit.jupiter.api.Assertions.assertEquals(70, rewards.getUserProgress(user).totalXp());
    }

    private int totalXp(String token) throws Exception {
        return json.readTree(mvc.perform(get("/api/rewards/progress").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("totalXp").asInt();
    }


    @Test void weeklyInsightsAreOwnedAuthenticatedAndExcludePrivateNotes() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email), other = register(UUID.randomUUID() + "@example.com");
        var today = userTime.today(users.findByEmail(email).orElseThrow());
        long habit = createHabit(token);
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "date", today.toString(), "status", "COMPLETED", "note", "private-note-not-for-insights"))))
                .andExpect(status().isCreated());
        String body = mvc.perform(get("/api/insights/weekly").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(1))
                .andExpect(jsonPath("$.evidence.length()").value(1)).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("private-note-not-for-insights"));
        org.junit.jupiter.api.Assertions.assertFalse(body.contains(email));
        mvc.perform(get("/api/insights/weekly").header("Authorization", "Bearer " + other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(0))
                .andExpect(jsonPath("$.evidence.length()").value(0));
        mvc.perform(get("/api/insights/weekly")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/insights/weekly").param("date", today.plusDays(1).toString()).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }


    @Test void restartPlansSyncOnlyForOwnerAndRejectStaleEdits() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");
        var body=Map.of("name","Read again","reason","BUSY","start","2026-10-19","steps",java.util.List.of("Two minutes","Repeat","Review"),"expectedVersion",0);
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
          .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
          .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get("/api/restart-plan").header("Authorization","Bearer "+other)).andExpect(status().isOk()).andExpect(content().string(""));
        var stale=new java.util.HashMap<String,Object>(body);stale.put("name","Different");
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(stale))).andExpect(status().isConflict());
        stale.put("expectedVersion",1);
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(stale))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
        mvc.perform(get("/api/restart-plan").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.name").value("Different"));
        stale.put("steps",java.util.List.of("one"));
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(stale))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/restart-plan")).andExpect(status().isUnauthorized());
    }


    @Test void simultaneousRestartPlansHaveOneWinnerAndNeverChangeXp() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");
        int xp=totalXp(token);
        var start=new java.util.concurrent.CountDownLatch(1);
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var results=new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for(String name:java.util.List.of("Device A plan","Device B plan")) results.add(pool.submit(()->{
                start.await();
                return mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("name",name,"reason","BUSY","start","2026-10-14","steps",java.util.List.of("One","Two","Three"),"expectedVersion",0))))
                    .andReturn().getResponse().getStatus();
            }));
            start.countDown();var statuses=new java.util.ArrayList<Integer>();
            for(var result:results) statuses.add(result.get(15,java.util.concurrent.TimeUnit.SECONDS));
            java.util.Collections.sort(statuses);
            org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200,409),statuses);
        } finally {start.countDown();pool.shutdownNow();}
        mvc.perform(get("/api/restart-plan").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        org.junit.jupiter.api.Assertions.assertEquals(xp,totalXp(token));
    }


    private java.util.Map<String,Object> goalExpected(String token,long id) throws Exception {
        var rows=json.readTree(mvc.perform(get("/api/goals").header("Authorization","Bearer "+token)).andReturn().getResponse().getContentAsString());
        for(var row:rows) if(row.get("id").asLong()==id){
            var value=json.convertValue(row,new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String,Object>>(){});
            value.remove("progress");return value;
        }
        throw new AssertionError("Goal missing");
    }
    @Test void goalPlansCreateRealLinkedHabitsAndRetryWithoutDuplicates() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");
        long goal=createGoalForQuota(token);
        var body=new java.util.HashMap<String,Object>();body.put("requestId",UUID.randomUUID().toString());body.put("expected",goalExpected(token,goal));
        body.put("habit",Map.of("name","Read five minutes","description","After breakfast","difficulty","EASY","targetPerWeek",3));
        String created=mvc.perform(post("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long habit=json.readTree(created).get("id").asLong();
        mvc.perform(get("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(habit));
        mvc.perform(get("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(post("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isNotFound());
        mvc.perform(post("/api/goals/"+goal+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"amount\":1}")).andExpect(status().isOk());
        mvc.perform(post("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(habit));
        checkIn(token,habit,"COMPLETED","A real step");
        mvc.perform(get("/api/goals").header("Authorization","Bearer "+token)).andExpect(jsonPath("$[0].currentValue").value(1));
        mvc.perform(get("/api/habits/goal-links").header("Authorization","Bearer "+token)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].habitId").value(habit)).andExpect(jsonPath("$[0].goalId").value(goal)).andExpect(jsonPath("$[0].currentValue").value(1));
        mvc.perform(get("/api/habits/goal-links").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.length()").value(0));
        body.put("requestId",UUID.randomUUID().toString());
        mvc.perform(post("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/goals/"+goal+"/habits")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/habits/goal-links")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/goals/"+goal).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/habits/goal-links").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(1));
    }
    @Test void goalHabitQuotaFailureRollsBackHabitAndApplicationReceipt() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);
        long goal=createGoalForQuota(token);
        for(int i=0;i<10;i++)createHabit(token);
        var body=Map.of("requestId",UUID.randomUUID().toString(),"expected",goalExpected(token,goal),"habit",Map.of("name","Another habit","difficulty","EASY","targetPerWeek",3));
        mvc.perform(post("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(10));
        org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from goal_habit_plan where user_id=?",Integer.class,users.findByEmail(email).orElseThrow().getId()));
    }


    @Test void habitGoalLinksExcludeMismatchedOwnersEvenForMalformedApplicationRows() throws Exception {
        String email=UUID.randomUUID()+"@example.com",foreignEmail=UUID.randomUUID()+"@example.com";
        String token=register(email),foreign=register(foreignEmail);
        long owner=users.findByEmail(email).orElseThrow().getId();
        long goal=createGoalForQuota(token),foreignGoal=createGoalForQuota(foreign);
        long habit=createHabit(token),foreignHabit=createHabit(foreign);
        for(long[] pair:java.util.List.of(new long[]{goal,habit},new long[]{goal,foreignHabit},new long[]{foreignGoal,habit}))
            accountingDb.update("insert into goal_habit_plan(user_id,goal_id,habit_id,request_id) values (?,?,?,?)",owner,pair[0],pair[1],UUID.randomUUID().toString());
        mvc.perform(get("/api/habits/goal-links").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].habitId").value(habit)).andExpect(jsonPath("$[0].goalId").value(goal));
        mvc.perform(get("/api/habits/goal-links").header("Authorization","Bearer "+foreign)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test void existingHabitLinksAtQuotaWithoutDuplicatesAndKeepsRetryIdentity() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");
        long goal=createGoalForQuota(token),second=createGoalForQuota(token),habit=createHabit(token);
        for(int i=0;i<9;i++)createHabit(token);
        var body=new java.util.HashMap<String,Object>();body.put("requestId",UUID.randomUUID().toString());body.put("habitId",habit);body.put("expected",goalExpected(token,goal));
        String route="/api/goals/"+goal+"/habits/link";
        mvc.perform(post(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(habit));
        mvc.perform(post("/api/goals/"+goal+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"amount\":1}")).andExpect(status().isOk());
        mvc.perform(post(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk());
        body.put("requestId",UUID.randomUUID().toString());
        mvc.perform(post(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk());
        mvc.perform(get("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/habits/goal-links").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(1));
        var createBody=Map.of("requestId",body.get("requestId"),"expected",goalExpected(token,goal),"habit",Map.of("name","Duplicate","difficulty","EASY","targetPerWeek",3));
        mvc.perform(post("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(createBody))).andExpect(status().isConflict());
        body.put("requestId",UUID.randomUUID().toString());body.put("expected",goalExpected(token,second));
        mvc.perform(post("/api/goals/"+second+"/habits/link").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk());
        mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(10));
        mvc.perform(post(route).header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isNotFound());
        mvc.perform(post(route).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isUnauthorized());
    }
    @Test void newHabitLinkRequiresOwnedActiveHabitAndFreshGoal() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");
        long goal=createGoalForQuota(token),habit=createHabit(token),foreign=createHabit(other);
        var body=new java.util.HashMap<String,Object>();body.put("requestId",UUID.randomUUID().toString());body.put("habitId",foreign);body.put("expected",goalExpected(token,goal));
        String route="/api/goals/"+goal+"/habits/link";
        mvc.perform(post(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isNotFound());
        body.put("habitId",habit);
        mvc.perform(post("/api/goals/"+goal+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"amount\":1}")).andExpect(status().isOk());
        mvc.perform(post(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        body.put("expected",goalExpected(token,goal));
        mvc.perform(patch("/api/habits/"+habit).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}")).andExpect(status().isOk());
        mvc.perform(post(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        mvc.perform(get("/api/goals/"+goal+"/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(0));
    }

    @Test void focusHistoryRangeUsesAccountCalendarAndInclusiveEndDate() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);var user=users.findByEmail(email).orElseThrow();var day=userTime.today(user).minusDays(1);var window=userTime.day(user,day);
        for(var instant:java.util.List.of(window.start().minusSeconds(1),window.start(),window.end().minusSeconds(1),window.end())){var session=new com.selfforge.discipline.pomodoro.PomodoroSession(user,null,25,instant);session.complete("Calendar focus",instant.plusSeconds(1500));focusSearchFixtures.save(session);}
        mvc.perform(get("/api/pomodoro/history").param("q","calendar").param("fromDate",day.toString()).param("toDate",day.toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2));
        mvc.perform(get("/api/pomodoro/history").param("fromDate",day.plusDays(1).toString()).param("toDate",day.toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/pomodoro/history").param("toDate",userTime.today(user).plusDays(1).toString()).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
    }

    @Test void focusNoteSearchIsLiteralOwnedAndPaginated() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),otherEmail=UUID.randomUUID()+"@example.com";register(otherEmail);
        var user=users.findByEmail(email).orElseThrow();var other=users.findByEmail(otherEmail).orElseThrow();var now=java.time.Instant.now();
        for(int i=0;i<23;i++){var session=new com.selfforge.discipline.pomodoro.PomodoroSession(user,null,25,now.minusSeconds(3600+i));session.complete("Read %_ Java "+i,now.minusSeconds(1000));focusSearchFixtures.save(session);}
        var foreign=new com.selfforge.discipline.pomodoro.PomodoroSession(other,null,25,now.minusSeconds(3600));foreign.complete("Read %_ FOREIGN",now);focusSearchFixtures.save(foreign);
        var unrelated=new com.selfforge.discipline.pomodoro.PomodoroSession(user,null,25,now.minusSeconds(3600));unrelated.complete("Read anything",now);focusSearchFixtures.save(unrelated);
        String first=mvc.perform(get("/api/pomodoro/history").param("q"," %_ jAvA ").param("completed","true").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(20)).andExpect(jsonPath("$.summary.total").value(23)).andExpect(jsonPath("$.summary.completed").value(23)).andExpect(jsonPath("$.summary.minutes").value(575)).andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/pomodoro/history").param("q","%_ java").param("beforeId",json.readTree(first).get("nextCursor").asText()).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(3)).andExpect(jsonPath("$.summary.total").value(23)).andExpect(jsonPath("$.summary.minutes").value(575));
        mvc.perform(get("/api/pomodoro/history").param("q","FOREIGN").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/pomodoro/history").param("q","%_ java").param("completed","false").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/pomodoro/history").param("q","x".repeat(101)).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/pomodoro/history").param("q","java")).andExpect(status().isUnauthorized());
    }

    @Test void scheduledChallengeExcludesEarlierCheckInsAndKeepsStartDateOnRetry() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);var today=userTime.today(users.findByEmail(email).orElseThrow());long habit=createHabit(token);
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.toString(),"status","COMPLETED")))).andExpect(status().isCreated());
        var body=new java.util.HashMap<String,Object>(Map.of("habitId",habit,"name","Start next week","targetDays",3,"windowDays",7,"startDate",today.plusDays(7).toString(),"requestId",UUID.randomUUID().toString()));
        String value=mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isCreated()).andExpect(jsonPath("$.startDate").value(today.plusDays(7).toString())).andExpect(jsonPath("$.endDate").value(today.plusDays(13).toString())).andExpect(jsonPath("$.completedDays").value(0)).andExpect(jsonPath("$.status").value("ACTIVE")).andReturn().getResponse().getContentAsString();long id=json.readTree(value).get("id").asLong();
        mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.id").value(id));
        mvc.perform(get("/api/challenges/"+id+"/history").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.entries.length()").value(0));
        body.put("startDate",today.plusDays(8).toString());mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
    }

    @Test void flexibleChallengeCountsNonconsecutiveDaysAndKeepsRetryWindowImmutable() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);var today=userTime.today(users.findByEmail(email).orElseThrow());long habit=createHabit(token);
        var body=new java.util.HashMap<String,Object>(Map.of("habitId",habit,"name","Three in seven","targetDays",3,"windowDays",7,"startDate",today.minusDays(6).toString(),"requestId",UUID.randomUUID().toString()));
        String value=mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isCreated()).andExpect(jsonPath("$.endDate").value(today.toString())).andReturn().getResponse().getContentAsString();long id=json.readTree(value).get("id").asLong();
        mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.id").value(id));body.put("windowDays",8);mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        for(int offset:java.util.List.of(6,3,0))mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.minusDays(offset).toString(),"status","COMPLETED")))).andExpect(status().isCreated());
        mvc.perform(get("/api/challenges/"+id+"/progress").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.completedDays").value(3)).andExpect(jsonPath("$.status").value("COMPLETED"));
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.minusDays(3).toString(),"status","SKIPPED")))).andExpect(status().isCreated());mvc.perform(get("/api/challenges/"+id+"/progress").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.completedDays").value(2)).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(get("/api/challenges/"+id+"/history").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.challengeId").value(id)).andExpect(jsonPath("$.habitId").value(habit)).andExpect(jsonPath("$.entries.length()").value(3)).andExpect(jsonPath("$.entries[1].status").value("SKIPPED")).andExpect(jsonPath("$.entries[0].note").doesNotExist());
        String other=register(UUID.randomUUID()+"@example.com");mvc.perform(get("/api/challenges/"+id+"/history").header("Authorization","Bearer "+other)).andExpect(status().isNotFound());mvc.perform(get("/api/challenges/"+id+"/history")).andExpect(status().isUnauthorized());
        body.put("requestId",UUID.randomUUID().toString());body.put("windowDays",2);mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
    }
    @Test void explicitDefaultChallengeWindowPreservesLegacyRetryFingerprint() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);var body=new java.util.HashMap<String,Object>(Map.of("habitId",habit,"name","Legacy","targetDays",7,"requestId",UUID.randomUUID().toString()));String value=mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(value).get("id").asLong();body.put("windowDays",7);mvc.perform(post("/api/challenges").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
    }

    @Test void goalProgressHistoryRecordsActualClippedAdditionsOnceAndSeparatesCorrections() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");String value=mvc.perform(post("/api/goals").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Read\",\"targetValue\":10,\"unit\":\"pages\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(value).get("id").asLong();
        var first=Map.of("amount",5,"requestId",UUID.randomUUID().toString());for(int n=0;n<2;n++)mvc.perform(post("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(first))).andExpect(status().isOk());
        value=mvc.perform(post("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("amount",100,"requestId",UUID.randomUUID().toString())))).andExpect(jsonPath("$.currentValue").value(10)).andReturn().getResponse().getContentAsString();
        mvc.perform(patch("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentValue",4,"expected",json.readTree(value))))).andExpect(status().isOk());
        mvc.perform(get("/api/goals/"+id+"/progress-history").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(3)).andExpect(jsonPath("$.items[0].kind").value("CORRECTION")).andExpect(jsonPath("$.items[1].kind").value("ADD")).andExpect(jsonPath("$.items[1].fromValue").value(5)).andExpect(jsonPath("$.items[1].toValue").value(10));
        mvc.perform(get("/api/goals/"+id+"/progress-history?kind=ADD").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(2));mvc.perform(get("/api/goals/"+id+"/progress-corrections").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(get("/api/goals/"+id+"/progress-history?kind=UNKNOWN").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());mvc.perform(get("/api/goals/"+id+"/progress-history").header("Authorization","Bearer "+other)).andExpect(status().isNotFound());mvc.perform(get("/api/goals/"+id+"/progress-history")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/profile/data").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.goal_progress_history.length()").value(3)).andExpect(jsonPath("$.goal_progress_corrections.length()").value(1));
    }

    @Test void goalCorrectionHistoryIsOwnedPaginatedAndDeletedWithGoal() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");
        String value=mvc.perform(post("/api/goals").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Read\",\"targetValue\":100,\"unit\":\"pages\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(value).get("id").asLong();
        for(int n=1;n<=25;n++){var body=Map.of("currentValue",n,"expected",json.readTree(value));for(int retry=0;retry<2;retry++)value=mvc.perform(patch("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();}
        String first=mvc.perform(get("/api/goals/"+id+"/progress-corrections").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(20)).andExpect(jsonPath("$.items[0].fromValue").value(24)).andExpect(jsonPath("$.items[0].toValue").value(25)).andExpect(jsonPath("$.items[0].unit").value("pages")).andReturn().getResponse().getContentAsString();long cursor=json.readTree(first).get("nextCursor").asLong();
        mvc.perform(get("/api/goals/"+id+"/progress-corrections?beforeId="+cursor).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(5));
        mvc.perform(get("/api/goals/"+id+"/progress-corrections").header("Authorization","Bearer "+other)).andExpect(status().isNotFound());mvc.perform(get("/api/goals/"+id+"/progress-corrections")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/goals/"+id+"/progress-daily?days=7").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].corrections").value(25)).andExpect(jsonPath("$.items[0].increased").value(25)).andExpect(jsonPath("$.items[0].added").value(0));
        var daily=json.readTree(mvc.perform(get("/api/goals/"+id+"/progress-daily?days=7").header("Authorization","Bearer "+token)).andReturn().getResponse().getContentAsString());String recordedDay=daily.get("items").get(0).get("date").asText();
        var dayPage=json.readTree(mvc.perform(get("/api/goals/"+id+"/progress-day?date="+recordedDay).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.date").value(recordedDay)).andExpect(jsonPath("$.items.length()").value(20)).andReturn().getResponse().getContentAsString());
        mvc.perform(get("/api/goals/"+id+"/progress-day?date="+recordedDay+"&beforeId="+dayPage.get("nextCursor").asLong()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(5));
        mvc.perform(get("/api/goals/"+id+"/progress-day?date="+recordedDay).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/goals/"+id+"/progress-day?date="+recordedDay)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/goals/"+id+"/progress-day?date="+recordedDay+"&beforeId=0").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/goals/"+id+"/progress-day?date=9999-12-31").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/goals/"+id+"/progress-daily?days=365").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/goals/"+id+"/progress-daily").header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/goals/"+id+"/progress-daily")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/goals/"+id+"/progress-corrections?beforeId=0").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/profile/data").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.goal_progress_corrections.length()").value(25));
        mvc.perform(get("/api/profile/data").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.goal_progress_corrections.length()").value(0));
        mvc.perform(delete("/api/goals/"+id).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from goal_progress_correction where goal_id=?",Integer.class,id));
    }

    @Test void goalCorrectionReopeningRespectsFreeQuotaAndAllowsZeroAfterAFreeSlotExists() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");
        String initial=mvc.perform(post("/api/goals").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Done\",\"targetValue\":10}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(initial).get("id").asLong();
        String completed=mvc.perform(post("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"amount\":10}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long activeId=0;for(int n=0;n<3;n++){String value=mvc.perform(post("/api/goals").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Active\",\"targetValue\":10}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();activeId=json.readTree(value).get("id").asLong();}
        var body=Map.of("currentValue",0,"expected",json.readTree(completed));
        mvc.perform(patch("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        mvc.perform(post("/api/goals/"+activeId+"/abandon").header("Authorization","Bearer "+token)).andExpect(status().isOk());
        mvc.perform(patch("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.currentValue").value(0)).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(patch("/api/goals/"+activeId+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentValue",0,"expected",json.readTree(completed))))).andExpect(status().isConflict());
    }

    @Test void goalAbsoluteCorrectionReopensCompletedGoalWithoutXpAndRejectsStaleOrForeignEdits() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");int xp=totalXp(token);
        String initial=mvc.perform(post("/api/goals").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Read\",\"targetValue\":10,\"unit\":\"pages\"}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();long id=json.readTree(initial).get("id").asLong();
        String completed=mvc.perform(post("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"amount\":10}")).andExpect(jsonPath("$.status").value("COMPLETED")).andReturn().getResponse().getContentAsString();
        var expected=json.readTree(completed);var body=Map.of("currentValue",4,"expected",expected);
        for(int n=0;n<2;n++)mvc.perform(patch("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.currentValue").value(4)).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(patch("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentValue",2,"expected",expected)))).andExpect(status().isConflict());
        mvc.perform(patch("/api/goals/"+id+"/progress").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isNotFound());
        mvc.perform(patch("/api/goals/"+id+"/progress").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/goals/"+id+"/progress").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentValue",11,"expected",expected)))).andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals(xp,totalXp(token));
    }

    @Test void habitTrendFocusTotalsUseCompletedOwnedSessionsAndAccountDayBoundaries() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),otherEmail=UUID.randomUUID()+"@example.com",other=register(otherEmail);
        var user=users.findByEmail(email).orElseThrow();var today=userTime.today(user);long habit=createHabit(token),unrelated=createHabit(token);long foreignUser=users.findByEmail(otherEmail).orElseThrow().getId();
        var currentStart=userTime.day(user,today.minusDays(6)).start();var previousStart=userTime.day(user,today.minusDays(13)).start();
        accountingDb.update("insert into pomodoro_session(user_id,habit_id,duration_minutes,completed,started_at,note) values(?,?,45,true,?,'PRIVATE FOCUS NOTE')",user.getId(),habit,java.sql.Timestamp.from(currentStart));
        accountingDb.update("insert into pomodoro_session(user_id,habit_id,duration_minutes,completed,started_at) values(?,?,25,true,?)",user.getId(),habit,java.sql.Timestamp.from(previousStart));
        for(var spec:java.util.List.of(new Object[]{user.getId(),habit,60,false},new Object[]{user.getId(),unrelated,60,true},new Object[]{foreignUser,habit,60,true},new Object[]{user.getId(),null,60,true},new Object[]{user.getId(),habit,5,true}))accountingDb.update("insert into pomodoro_session(user_id,habit_id,duration_minutes,completed,started_at) values(?,?,?,?,?)",spec[0],spec[1],spec[2],spec[3],java.sql.Timestamp.from(currentStart));
        String result=mvc.perform(get("/api/stats/habits/"+habit+"?days=7").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.currentFocus.sessions").value(1)).andExpect(jsonPath("$.currentFocus.minutes").value(45)).andExpect(jsonPath("$.previousFocus.sessions").value(1)).andExpect(jsonPath("$.previousFocus.minutes").value(25)).andExpect(jsonPath("$.current.completed").value(0)).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(result.contains("PRIVATE FOCUS NOTE"));
        mvc.perform(get("/api/stats/habits/"+habit+"?days=28").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.currentFocus.sessions").value(2)).andExpect(jsonPath("$.currentFocus.minutes").value(70));
        mvc.perform(get("/api/stats/habits/"+habit).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
    }

    @Test void habitTrendUsesOwnedCalendarEvidenceWithoutTreatingMissingDaysAsFailures() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);var today=userTime.today(users.findByEmail(email).orElseThrow());
        checkIn(token,habit,"COMPLETED","PRIVATE NOTE");
        for(var offset:java.util.List.of(7,8,28,56))accountingDb.update("insert into daily_check_in(habit_id,check_date,status,note,created_at) values(?,?,?,?,?)",habit,java.sql.Date.valueOf(today.minusDays(offset)),offset==8?"FAILED":"SKIPPED","PRIVATE NOTE",java.sql.Timestamp.from(java.time.Instant.now()));
        String body=mvc.perform(get("/api/stats/habits/"+habit+"?days=7").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.start").value(today.minusDays(6).toString())).andExpect(jsonPath("$.current.completed").value(1)).andExpect(jsonPath("$.current.failed").value(0)).andExpect(jsonPath("$.previous.failed").value(1)).andExpect(jsonPath("$.previous.skipped").value(1)).andExpect(jsonPath("$.evidence.length()").value(3)).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("PRIVATE NOTE"));
        mvc.perform(get("/api/stats/habits/"+habit+"?days=28").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.current.completed").value(1)).andExpect(jsonPath("$.current.failed").value(1)).andExpect(jsonPath("$.previous.skipped").value(1)).andExpect(jsonPath("$.evidence.length()").value(4));
        mvc.perform(get("/api/stats/habits/"+habit).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/stats/habits/"+habit)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/stats/habits/"+habit+"?days=365").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
    }

    @Test void restartDayTrackingIsOwnedVersionedRetryableAndDoesNotAwardXp() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");int xp=totalXp(token);
        var plan=new java.util.HashMap<String,Object>(Map.of("name","Restart","reason","BUSY","start","2000-01-01","steps",java.util.List.of("One","Two","Three"),"expectedVersion",0));
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(plan))).andExpect(status().isOk());
        mvc.perform(get("/api/restart-plan/days?planVersion=1").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.version").value(0)).andExpect(jsonPath("$.tried[0]").value(false));
        var body=new java.util.HashMap<String,Object>(Map.of("planVersion",1,"expectedVersion",0,"day",1,"tried",true));
        for(int i=0;i<2;i++)mvc.perform(put("/api/restart-plan/days").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.tried[0]").value(true));
        body.put("day",2);mvc.perform(put("/api/restart-plan/days").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        body.put("expectedVersion",1);mvc.perform(put("/api/restart-plan/days").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.version").value(2)).andExpect(jsonPath("$.tried[1]").value(true));
        body.put("expectedVersion",2);body.put("day",1);body.put("tried",false);mvc.perform(put("/api/restart-plan/days").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.tried[0]").value(false));
        mvc.perform(get("/api/restart-plan/days?planVersion=1").header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/restart-plan/days?planVersion=1")).andExpect(status().isUnauthorized());
        plan.put("expectedVersion",1);plan.put("name","New plan");mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(plan))).andExpect(status().isOk());
        mvc.perform(get("/api/restart-plan/days?planVersion=2").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.version").value(0)).andExpect(jsonPath("$.tried[1]").value(false));
        mvc.perform(put("/api/restart-plan/days").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(xp,totalXp(token));
    }
    @Test void restartDayTrackingRejectsFutureDaysAndInvalidRequests() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);var today=userTime.today(users.findByEmail(email).orElseThrow());
        var plan=Map.of("name","Today","reason","BUSY","start",today.toString(),"steps",java.util.List.of("One","Two","Three"),"expectedVersion",0);
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(plan))).andExpect(status().isOk());
        for(int day:java.util.List.of(0,2,3,4))mvc.perform(put("/api/restart-plan/days").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("planVersion",1,"expectedVersion",0,"day",day,"tried",true)))).andExpect(status().isBadRequest());
        mvc.perform(put("/api/restart-plan/days").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("planVersion",1,"expectedVersion",0,"day",1,"tried",true)))).andExpect(status().isOk());
    }

    @Test void restartReviewPersistsOnlyForCurrentOwnedPlanAndRetriesWithoutXp() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");
        int xp=totalXp(token);
        var plan=new java.util.HashMap<String,Object>(Map.of("name","Read again","reason","BUSY","start","2000-01-01","steps",java.util.List.of("Two minutes","Repeat","Review"),"expectedVersion",0));
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(plan))).andExpect(status().isOk());
        var review=new java.util.HashMap<String,Object>(Map.of("planVersion",1,"expectedVersion",0,"daysTried",2,"decision","EASIER","note","Morning worked better"));
        for(int i=0;i<2;i++)mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(review))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get("/api/restart-plan/review").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.daysTried").value(2)).andExpect(jsonPath("$.note").value("Morning worked better"));
        mvc.perform(get("/api/restart-plan/review").header("Authorization","Bearer "+other)).andExpect(content().string(""));
        mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(review))).andExpect(status().isNotFound());
        review.put("decision","KEEP");
        mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(review))).andExpect(status().isConflict());
        review.put("expectedVersion",1);
        mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(review))).andExpect(jsonPath("$.version").value(2));
        plan.put("name","New plan");plan.put("expectedVersion",1);
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(plan))).andExpect(status().isOk());
        mvc.perform(get("/api/restart-plan/review").header("Authorization","Bearer "+token)).andExpect(content().string(""));
        mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(review))).andExpect(status().isConflict());
        review.put("planVersion",2);review.put("expectedVersion",0);
        mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(review))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        org.junit.jupiter.api.Assertions.assertEquals(xp,totalXp(token));
        mvc.perform(get("/api/restart-plan/review")).andExpect(status().isUnauthorized());
    }
    @Test void restartReviewRejectsEarlyOrInvalidSelfReports() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");
        var plan=Map.of("name","Future","reason","BUSY","start","2099-01-01","steps",java.util.List.of("One","Two","Three"),"expectedVersion",0);
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(plan))).andExpect(status().isOk());
        var review=new java.util.HashMap<String,Object>(Map.of("planVersion",1,"expectedVersion",0,"daysTried",2,"decision","KEEP","note",""));
        mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(review))).andExpect(status().isBadRequest());
        review.put("daysTried",4);
        mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(review))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/restart-plan/review").header("Authorization","Bearer "+token)).andExpect(content().string(""));
    }

    @Test void recoverableCustomFocusSessionKeepsIdentityOwnershipAndSingleCredit() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");
        long habit=createHabit(token);int before=totalXp(token);
        var body=Map.of("habitId",habit,"durationMinutes",45,"requestId",UUID.randomUUID().toString());
        String result=mvc.perform(post("/api/pomodoro/start").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long session=json.readTree(result).get("id").asLong();
        mvc.perform(get("/api/pomodoro/"+session).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.durationMinutes").value(45)).andExpect(jsonPath("$.habitId").value(habit)).andExpect(jsonPath("$.completed").value(false));
        mvc.perform(get("/api/pomodoro/"+session).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/pomodoro/"+session)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/pomodoro/"+session+"/complete").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{}" )).andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(before,totalXp(token));
        accountingDb.update("update pomodoro_session set started_at=? where id=?",java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(2701)),session);
        for(int i=0;i<2;i++)mvc.perform(post("/api/pomodoro/"+session+"/complete").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{}" )).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(session));
        org.junit.jupiter.api.Assertions.assertEquals(before+5,totalXp(token));
        mvc.perform(get("/api/pomodoro/"+session).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.completed").value(true));
        mvc.perform(post("/api/pomodoro/start").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.id").value(session));
    }

    @Test void dailyFocusPlanSyncsAcrossDevicesAndRejectsStaleOrForeignHabits() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");
        long owner=users.findByEmail(email).orElseThrow().getId(),first=createHabit(token),second=createHabit(token),foreign=createHabit(other);
        String todaySchedule=userTime.today(users.findById(owner).orElseThrow()).getDayOfWeek().name().substring(0,3);
        for(long habitId:java.util.List.of(first,second)) mvc.perform(patch("/api/habits/"+habitId).header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("targetPerWeek",1,"scheduledDays",todaySchedule))))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/habits/"+foreign).header("Authorization","Bearer "+other)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("targetPerWeek",1,"scheduledDays",todaySchedule))))
                .andExpect(status().isOk());
        var body=new java.util.HashMap<String,Object>(Map.of("budget",90,"energy","MEDIUM","habitIds",java.util.List.of(first,second),"expectedVersion",0));
        for(int i=0;i<2;i++)mvc.perform(put("/api/daily-focus-plans").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.habitIds[0]").value(first));
        mvc.perform(get("/api/daily-focus-plans").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.budget").value(90)).andExpect(jsonPath("$.energy").value("MEDIUM"));
        mvc.perform(get("/api/daily-focus-plans").header("Authorization","Bearer "+other)).andExpect(content().string(""));
        body.put("budget",60);body.put("expectedVersion",0);
        mvc.perform(put("/api/daily-focus-plans").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        body.put("expectedVersion",1);
        mvc.perform(put("/api/daily-focus-plans").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2)).andExpect(jsonPath("$.budget").value(60));
        var foreignBody=Map.of("budget",60,"energy","LOW","habitIds",java.util.List.of(foreign),"expectedVersion",0);
        mvc.perform(put("/api/daily-focus-plans").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(foreignBody))).andExpect(status().isNotFound());
        mvc.perform(put("/api/daily-focus-plans").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(foreignBody))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(delete("/api/profile/account").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword","password123","confirmationEmail",email)))).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from daily_focus_plan where user_id=?",Integer.class,owner));
        mvc.perform(get("/api/daily-focus-plans").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.habitIds[0]").value(foreign));
    }

    @Test void dailyFocusPlanRejectsScheduledRestHabit() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);
        long owner=users.findByEmail(email).orElseThrow().getId(),habit=createHabit(token);
        var today=userTime.today(users.findById(owner).orElseThrow());
        String restSchedule=java.util.Arrays.stream(java.time.DayOfWeek.values())
                .filter(day->day!=today.getDayOfWeek()).limit(5)
                .map(day->day.name().substring(0,3)).collect(java.util.stream.Collectors.joining(","));
        mvc.perform(patch("/api/habits/"+habit).header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("targetPerWeek",5,"scheduledDays",restSchedule))))
                .andExpect(status().isOk());
        var body=Map.of("budget",60,"energy","MEDIUM","habitIds",java.util.List.of(habit),"expectedVersion",0);
        mvc.perform(put("/api/daily-focus-plans").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isConflict());
    }

    @Test void weeklyActionPlanPersistsAndHandlesRetriesCompletionAndStaleEdits() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");
        long owner=users.findByEmail(email).orElseThrow().getId();int xp=totalXp(token);
        var week=java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        String route="/api/week-plans/"+week;
        var body=new java.util.HashMap<String,Object>(Map.of("action","Read five minutes","date",week.toString(),"time","08:15","expectedVersion",0));
        for(int i=0;i<2;i++)mvc.perform(put(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get("/api/week-plans").param("week",week.toString()).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.action").value("Read five minutes"));
        mvc.perform(get("/api/week-plans/current").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.week").value(week.toString()));
        mvc.perform(get("/api/week-plans").param("week",week.toString()).header("Authorization","Bearer "+other)).andExpect(content().string(""));
        for(int i=0;i<2;i++)mvc.perform(patch(route+"/completion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"completed\":true,\"expectedVersion\":1}")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
        body.put("action","New action");body.put("expectedVersion",1);
        mvc.perform(put(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        body.put("expectedVersion",2);
        mvc.perform(put(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(false)).andExpect(jsonPath("$.version").value(3));
        mvc.perform(patch(route+"/completion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"completed\":true,\"expectedVersion\":1}")).andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(xp,totalXp(token));
        org.junit.jupiter.api.Assertions.assertEquals(1,accountingDb.queryForObject("select count(*) from week_action_plan where user_id=?",Integer.class,owner));
        body.put("expectedVersion",0);
        mvc.perform(put(route).header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk());
        mvc.perform(delete("/api/profile/account").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword","password123","confirmationEmail",email)))).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from week_action_plan where user_id=?",Integer.class,owner));
        mvc.perform(get("/api/week-plans").param("week",week.toString()).header("Authorization","Bearer "+other)).andExpect(jsonPath("$.action").value("New action"));
    }
    @Test void weeklyActionPlanRejectsInvalidSchedulesAndFutureCompletion() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");
        var week=java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.MONDAY));
        String route="/api/week-plans/"+week;
        var body=new java.util.HashMap<String,Object>(Map.of("action","A small step","date",week.toString(),"time","","expectedVersion",0));
        mvc.perform(put(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk());
        mvc.perform(patch(route+"/completion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"completed\":true,\"expectedVersion\":1}")).andExpect(status().isConflict());
        mvc.perform(patch(route+"/completion").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content("{\"completed\":true,\"expectedVersion\":1}")).andExpect(status().isNotFound());
        body.put("date",week.plusDays(7).toString());
        mvc.perform(put(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body.put("date",week.toString());body.put("time","24:00");
        mvc.perform(put(route).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body.put("time","");
        mvc.perform(put("/api/week-plans/"+week.plusDays(1)).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/week-plans").param("week",week.toString())).andExpect(status().isUnauthorized());
    }

    @Test void companionProgressUsesRecordedHabitPointsAndNotSpendableXp() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");
        var user=users.findByEmail(email).orElseThrow();long habit=createHabit(token);
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.visible").value(false)).andExpect(jsonPath("$.xp").value(0));
        checkIn(token,habit,"COMPLETED","Done");checkIn(token,habit,"COMPLETED","Edited note");
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(10)).andExpect(jsonPath("$.countedCheckIns").value(1));
        mvc.perform(patch("/api/habits/"+habit).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\":\"HARD\"}")).andExpect(status().isOk());
        rewards.deductXp(user,10);
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(10));
        rewards.addXp(user,50);
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(10));
        checkIn(token,habit,"SKIPPED","Corrected");
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(0));
        checkIn(token,habit,"COMPLETED","Restored");
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(10));
        mvc.perform(delete("/api/habits/"+habit).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(10));
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.xp").value(0));
        mvc.perform(get("/api/companion")).andExpect(status().isUnauthorized());
    }
    @Test void companionStagesExcludeLegacyRecordsWithUnknownPoints() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);checkIn(token,habit,"COMPLETED","");
        accountingDb.update("insert into daily_check_in(habit_id,check_date,status,created_at) values (?,?,?,?)",habit,java.sql.Date.valueOf(java.time.LocalDate.now().minusDays(1)),"COMPLETED",java.sql.Timestamp.from(java.time.Instant.now()));
        accountingDb.update("insert into daily_check_in(habit_id,check_date,status,created_at,points_snapshot) values (?,?,?,?,?)",habit,java.sql.Date.valueOf(java.time.LocalDate.now().minusDays(2)),"COMPLETED",java.sql.Timestamp.from(java.time.Instant.now()),25);
        accountingDb.update("update daily_check_in set points_snapshot=100 where habit_id=? and applied_xp is not null",habit);
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(100)).andExpect(jsonPath("$.stage").value(2)).andExpect(jsonPath("$.nextThreshold").value(500)).andExpect(jsonPath("$.legacyExcluded").value(2));
        accountingDb.update("update daily_check_in set points_snapshot=500 where habit_id=? and applied_xp is not null",habit);
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.stage").value(3)).andExpect(jsonPath("$.nextThreshold").doesNotExist());
    }
    @Test void companionPreferencesRetrySafelyAndDeleteWithTheirOwner() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");long owner=users.findByEmail(email).orElseThrow().getId();
        var body=new java.util.HashMap<String,Object>(Map.of("species","CHON","name","Leaf","visible",true,"expectedVersion",0,"xp",9999));
        for(int i=0;i<2;i++)mvc.perform(put("/api/companion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.xp").value(0));
        body.put("species","CHIM");
        mvc.perform(put("/api/companion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        body.put("expectedVersion",1);body.put("visible",false);
        mvc.perform(put("/api/companion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.species").value("CHIM")).andExpect(jsonPath("$.visible").value(false));
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.version").value(0));
        body.put("species","INVALID");mvc.perform(put("/api/companion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/profile/account").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword","password123","confirmationEmail",email)))).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from companion_preference where user_id=?",Integer.class,owner));
        org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from companion_milestone_ack where user_id=?",Integer.class,owner));
    }

    @Test void companionMilestonesAreAcknowledgedOnceAcrossDevices() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");long owner=users.findByEmail(email).orElseThrow().getId(),habit=createHabit(token);
        checkIn(token,habit,"COMPLETED","");
        mvc.perform(put("/api/companion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"species\":\"CHON\",\"name\":\"Leaf\",\"visible\":true,\"expectedVersion\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.pendingMilestone").doesNotExist());
        accountingDb.update("update daily_check_in set points_snapshot=100 where habit_id=? and applied_xp is not null",habit);
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.progressionVersion").value(1)).andExpect(jsonPath("$.stage").value(2)).andExpect(jsonPath("$.pendingMilestone").value(2));
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+other)).andExpect(status().isOk()).andExpect(jsonPath("$.pendingMilestone").doesNotExist());
        for(int ignored=0;ignored<2;ignored++)mvc.perform(post("/api/companion/milestones/2/ack").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.pendingMilestone").doesNotExist());
        org.junit.jupiter.api.Assertions.assertEquals(1,accountingDb.queryForObject("select count(*) from companion_milestone_ack where user_id=? and stage=2",Integer.class,owner));
        mvc.perform(post("/api/companion/milestones/3/ack").header("Authorization","Bearer "+token)).andExpect(status().isConflict());
        mvc.perform(post("/api/companion/milestones/1/ack").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        accountingDb.update("update daily_check_in set points_snapshot=500 where habit_id=? and applied_xp is not null",habit);
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.pendingMilestone").value(3));
        mvc.perform(post("/api/companion/milestones/3/ack").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.pendingMilestone").doesNotExist());
        mvc.perform(get("/api/profile/data").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.companion_preference.length()").value(1)).andExpect(jsonPath("$.companion_milestone_ack.length()").value(2));
        mvc.perform(post("/api/companion/milestones/2/ack")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/profile/account").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword","password123","confirmationEmail",email)))).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from companion_milestone_ack where user_id=?",Integer.class,owner));
    }

    @Test void companionHistoryExplainsSourceCreditsAndReversalsWithoutAccountPenalties() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);
        checkIn(token,habit,"COMPLETED","PRIVATE NOTE");checkIn(token,habit,"COMPLETED","Edited PRIVATE NOTE");
        mvc.perform(get("/api/companion/history").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(patch("/api/habits/"+habit).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\":\"HARD\"}")).andExpect(status().isOk());
        checkIn(token,habit,"FAILED","Corrected");checkIn(token,habit,"COMPLETED","Restored");
        String result=mvc.perform(get("/api/companion/history").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(3))
          .andExpect(jsonPath("$.items[0].delta").value(10)).andExpect(jsonPath("$.items[1].delta").value(-10)).andExpect(jsonPath("$.items[1].reason").value("REVERSED")).andExpect(jsonPath("$.items[2].delta").value(10))
          .andExpect(jsonPath("$.items[0].note").doesNotExist()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(result.contains("PRIVATE"));
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(10));
        mvc.perform(get("/api/companion/history").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/companion/history")).andExpect(status().isUnauthorized());
    }
    @Test void companionHistoryPagesAreBoundedAndHaveNoDuplicateSourcesBetweenPages() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);
        for(int i=0;i<25;i++)mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(i).toString(),"status","COMPLETED")))).andExpect(status().isCreated());
        String first=mvc.perform(get("/api/companion/history").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(20)).andReturn().getResponse().getContentAsString();
        var firstPage=json.readTree(first);long cursor=firstPage.get("nextCursor").asLong();
        String last=mvc.perform(get("/api/companion/history").param("beforeId",Long.toString(cursor)).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(5)).andExpect(jsonPath("$.nextCursor").doesNotExist()).andReturn().getResponse().getContentAsString();
        for(var row:json.readTree(last).get("items"))org.junit.jupiter.api.Assertions.assertTrue(row.get("id").asLong()<cursor);
        mvc.perform(get("/api/companion/history").param("beforeId","0").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
    }

    @Test void checkInPreviewIsReadOnlyAndPredictsCompanionStageCorrection() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);long habit=createHabit(token);checkIn(token,habit,"COMPLETED","Done");
        var today=java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        long checkIn=accountingDb.queryForObject("select id from daily_check_in where habit_id=? and check_date=?",Long.class,habit,java.sql.Date.valueOf(today));
        mvc.perform(put("/api/companion").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"species\":\"CHON\",\"name\":\"Leaf\",\"visible\":true,\"expectedVersion\":0}")).andExpect(status().isOk());
        accountingDb.update("insert into daily_check_in(habit_id,check_date,status,created_at,points_snapshot,applied_xp) values (?,?,?,?,?,?)",habit,java.sql.Date.valueOf(today.minusDays(1)),"COMPLETED",java.sql.Timestamp.from(java.time.Instant.now()),95,95);
        int before=totalXp(token);
        var expected=Map.of("id",checkIn,"status","COMPLETED","note","Done");
        var body=Map.of("habitId",habit,"date",today.toString(),"status","SKIPPED","expected",expected);
        mvc.perform(post("/api/check-ins/preview").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk())
         .andExpect(jsonPath("$.companionProgressionVersion").value(1)).andExpect(jsonPath("$.allowed").value(true)).andExpect(jsonPath("$.accountDelta").value(-10)).andExpect(jsonPath("$.companionXpBefore").value(105)).andExpect(jsonPath("$.companionXpAfter").value(95)).andExpect(jsonPath("$.stageBefore").value(2)).andExpect(jsonPath("$.stageAfter").value(1));
        org.junit.jupiter.api.Assertions.assertEquals(before,totalXp(token));
        org.junit.jupiter.api.Assertions.assertEquals("COMPLETED",accountingDb.queryForObject("select status from daily_check_in where id=?",String.class,checkIn));
        mvc.perform(post("/api/check-ins").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isCreated());
        mvc.perform(get("/api/companion").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.xp").value(95)).andExpect(jsonPath("$.stage").value(1));
        org.junit.jupiter.api.Assertions.assertEquals(before-10,totalXp(token));
    }
    @Test void checkInPreviewRejectsStaleAndForeignSourcesAndExplainsBlockedCorrections() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);checkIn(token,habit,"COMPLETED","Done");
        var today=java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));long checkIn=accountingDb.queryForObject("select id from daily_check_in where habit_id=?",Long.class,habit);
        rewards.deductXp(users.findByEmail(email).orElseThrow(),totalXp(token));
        var body=new java.util.HashMap<String,Object>(Map.of("habitId",habit,"date",today.toString(),"status","SKIPPED","expected",Map.of("id",checkIn,"status","COMPLETED","note","Done")));
        mvc.perform(post("/api/check-ins/preview").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.allowed").value(false)).andExpect(jsonPath("$.reason").value("INSUFFICIENT_XP"));
        mvc.perform(post("/api/check-ins/preview").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isNotFound());
        mvc.perform(post("/api/check-ins/preview").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isUnauthorized());
        body.put("expected",Map.of("id",checkIn,"status","COMPLETED","note","Stale"));
        mvc.perform(post("/api/check-ins/preview").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isConflict());
        body.put("expected",Map.of("id",checkIn,"status","COMPLETED","note","Done"));
        accountingDb.update("update daily_check_in set points_snapshot=null,applied_xp=null,failure_points_snapshot=null where id=?",checkIn);
        mvc.perform(post("/api/check-ins/preview").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.reason").value("LEGACY"));
        body.put("status","COMPLETED");
        mvc.perform(post("/api/check-ins/preview").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(jsonPath("$.allowed").value(true)).andExpect(jsonPath("$.accountDelta").value(0));
    }

    private String register(String email) throws Exception {
        var response = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "displayName", "Tester", "password", "password123", "termsAccepted", true))))
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
                .contentType(MediaType.APPLICATION_JSON).content("{\"oldPassword\":\"password123\",\"newPassword\":\"changed123\",\"confirmPassword\":\"changed123\"}"))
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
                .andExpect(jsonPath("$.isPremium").value(false))
                .andExpect(jsonPath("$.limits.journalDays").value(-1))
                .andExpect(jsonPath("$.limits.moodDays").value(-1));
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
        var safeRelease = org.hamcrest.Matchers.matchesPattern("unknown|[a-f0-9]{64}");
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP")).andExpect(jsonPath("$.release").value(safeRelease));
        mvc.perform(get("/api/health/ready")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP")).andExpect(jsonPath("$.release").value(safeRelease));
        mvc.perform(get("/api/health/live")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP")).andExpect(jsonPath("$.release").value(safeRelease));
        mvc.perform(get("/api/health").header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Expose-Headers", org.hamcrest.Matchers.containsString("X-Request-Id")));
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
    @Test void freezeQuotaMatchesTierAndRetryDoesNotConsumeAnotherUse() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long first = createHabit(token);
        long second = createHabit(token);
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"habitId\":" + first + "}"))
                    .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/streak-freeze/remaining").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.max").value(1)).andExpect(jsonPath("$.remaining").value(0));
        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"habitId\":" + second + "}"))
                .andExpect(status().isConflict());
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        mvc.perform(get("/api/streak-freeze/remaining").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.max").value(5)).andExpect(jsonPath("$.remaining").value(4));
        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"habitId\":" + second + "}"))
                .andExpect(status().isCreated());
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.PREMIUM, java.time.Instant.now().minusSeconds(60));
        users.save(user);
        mvc.perform(get("/api/streak-freeze/remaining").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.max").value(1)).andExpect(jsonPath("$.remaining").value(0));
    }

    @Test void concurrentFreezesCannotExceedFreeQuota() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        var habits = java.util.List.of(createHabit(token), createHabit(token));
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (Long habit : habits) futures.add(executor.submit(() -> {
                start.await();
                return mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"habitId\":" + habit + "}"))
                        .andReturn().getResponse().getStatus();
            }));
            start.countDown();
            var statuses = new java.util.ArrayList<Integer>();
            for (var future : futures) statuses.add(future.get(30, java.util.concurrent.TimeUnit.SECONDS));
            java.util.Collections.sort(statuses);
            org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(201, 409), statuses);
        }
        mvc.perform(get("/api/streak-freeze/remaining").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.remaining").value(0));
    }

    @Test void freezeRejectsMissingHabitAndOtherUsersHabit() throws Exception {
        String first = register(UUID.randomUUID() + "@example.com");
        String second = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(first);
        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + second)
                .contentType(MediaType.APPLICATION_JSON).content("{\"habitId\":" + habit + "}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + second)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/streak-freeze/remaining").header("Authorization", "Bearer " + second))
                .andExpect(jsonPath("$.remaining").value(1));
    }

    @Autowired com.selfforge.discipline.common.UserTime userTime;

    @Test void longStreakSurvivesFreezeAndAwardsMatchingAchievement() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long habit = createHabit(token);
        var user = users.findByEmail(email).orElseThrow();
        var today = userTime.today(user);
        for (int i = 1; i <= 150; i++) {
            if (i == 1) continue;
            accountingDb.update("insert into daily_check_in (habit_id, check_date, status) values (?, ?, 'COMPLETED')",
                    habit, today.minusDays(i));
        }
        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "date", today.minusDays(1).toString()))))
                .andExpect(status().isCreated());
        checkIn(token, habit, "COMPLETED", "Today");
        mvc.perform(get("/api/dashboard/today").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.habits[0].currentStreak").value(150));
        org.junit.jupiter.api.Assertions.assertTrue(rewards.getAllAchievements(user).stream()
                .anyMatch(a -> a.code().equals("STREAK_100") && a.earned()));
    }

    @Test void futureCheckInIsRejectedWithoutXpOrRecord() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long habit = createHabit(token);
        var user = users.findByEmail(email).orElseThrow();
        int before = rewards.getUserProgress(user).totalXp();
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("habitId", habit, "status", "COMPLETED",
                        "date", userTime.today(user).plusDays(1).toString()))))
                .andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals(before, rewards.getUserProgress(user).totalXp());
        org.junit.jupiter.api.Assertions.assertEquals(0,
                accountingDb.queryForObject("select count(*) from daily_check_in where habit_id = ?", Integer.class, habit));
    }

    private java.util.List<Integer> raceRequests(java.util.List<java.util.concurrent.Callable<Integer>> calls) throws Exception {
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(calls.size())) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (var call : calls) futures.add(executor.submit(() -> { start.await(); return call.call(); }));
            start.countDown();
            var statuses = new java.util.ArrayList<Integer>();
            for (var future : futures) statuses.add(future.get(30, java.util.concurrent.TimeUnit.SECONDS));
            java.util.Collections.sort(statuses);
            return statuses;
        }
    }

    private long createGoalForQuota(String token) throws Exception {
        var body = mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Read books\",\"targetValue\":10}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    @Test void concurrentHabitCreatesCannotExceedFreeQuota() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        for (int i = 0; i < 9; i++) createHabit(token);
        java.util.concurrent.Callable<Integer> create = () -> mvc.perform(post("/api/habits")
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Read\",\"difficulty\":\"MEDIUM\",\"targetPerWeek\":5}"))
                .andReturn().getResponse().getStatus();
        org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(201, 409), raceRequests(java.util.List.of(create, create)));
        org.junit.jupiter.api.Assertions.assertEquals(10, accountingDb.queryForObject(
                "select count(*) from habit where user_id = ? and active = true", Integer.class, users.findByEmail(email).orElseThrow().getId()));
    }

    @Test void restoringGoalsPreservesProgressAndCannotExceedQuotaConcurrently() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long first = createGoalForQuota(token), second = createGoalForQuota(token);
        mvc.perform(post("/api/goals/" + first + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":3}"))
                .andExpect(status().isOk());
        for (long id : java.util.List.of(first, second)) mvc.perform(post("/api/goals/" + id + "/abandon")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        createGoalForQuota(token); createGoalForQuota(token);
        var calls = new java.util.ArrayList<java.util.concurrent.Callable<Integer>>();
        for (long id : java.util.List.of(first, second)) calls.add(() -> mvc.perform(post("/api/goals/" + id + "/restore")
                .header("Authorization", "Bearer " + token)).andReturn().getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200, 409), raceRequests(calls));
        org.junit.jupiter.api.Assertions.assertEquals(3, accountingDb.queryForObject("select current_value from goal where id=?", Integer.class, first));
        Long active = accountingDb.queryForObject("select id from goal where id in (?,?) and status='ACTIVE'", Long.class, first, second);
        mvc.perform(post("/api/goals/" + active + "/restore").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        String other = register(UUID.randomUUID() + "@example.com");
        mvc.perform(post("/api/goals/" + first + "/restore").header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());
    }

    @Test void goalDeadlineCanBeClearedExplicitlyWithoutLosingOtherFields() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long id = createGoalForQuota(token);
        String path = "/api/goals/" + id;
        mvc.perform(patch(path).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"deadline\":\"2027-01-01\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.deadline").value("2027-01-01"));
        mvc.perform(patch(path).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Updated\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.deadline").value("2027-01-01"));
        mvc.perform(patch(path).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"clearDeadline\":true,\"deadline\":\"2027-01-02\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch(path).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"clearDeadline\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.deadline").isEmpty())
                .andExpect(jsonPath("$.name").value("Updated"));
    }

    @Test void concurrentGoalCreatesCannotExceedFreeQuotaAndAbandonFreesSlot() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long first = createGoalForQuota(token);
        createGoalForQuota(token);
        java.util.concurrent.Callable<Integer> create = () -> mvc.perform(post("/api/goals")
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Read\",\"targetValue\":10}")).andReturn().getResponse().getStatus();
        org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(201, 409), raceRequests(java.util.List.of(create, create)));
        org.junit.jupiter.api.Assertions.assertEquals(3, accountingDb.queryForObject(
                "select count(*) from goal where user_id = ? and status = 'ACTIVE'", Integer.class, users.findByEmail(email).orElseThrow().getId()));
        mvc.perform(post("/api/goals/" + first + "/abandon").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        createGoalForQuota(token);
    }

    @Test void goalCreateRequestIdReplaysOnceAndRejectsChangedPayload() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        long userId = users.findByEmail(email).orElseThrow().getId();
        String requestId = UUID.randomUUID().toString();
        var body = new java.util.LinkedHashMap<String, Object>();
        body.put("name", "Read 12 books");
        body.put("description", "One book each month");
        body.put("targetValue", 12);
        body.put("unit", "books");
        body.put("deadline", "2027-12-31");
        body.put("requestId", requestId);

        String first = mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(first).get("id").asLong();
        String replay = mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(id, json.readTree(replay).get("id").asLong());
        org.junit.jupiter.api.Assertions.assertEquals(1,
                accountingDb.queryForObject("select count(*) from goal_create_receipt where request_id = ?", Integer.class, requestId));
        org.junit.jupiter.api.Assertions.assertEquals(1,
                accountingDb.queryForObject("select count(*) from goal where user_id = ?", Integer.class, userId));

        body.put("targetValue", 13);
        mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(1,
                accountingDb.queryForObject("select count(*) from goal where user_id = ?", Integer.class, userId));
    }

    @Test void reactivatingHabitsCompetesForSameQuotaAndPreservesOwnership() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long first = createHabit(token);
        mvc.perform(delete("/api/habits/" + first).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        long second = createHabit(token);
        mvc.perform(delete("/api/habits/" + second).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        for (int i = 0; i < 9; i++) createHabit(token);
        var calls = new java.util.ArrayList<java.util.concurrent.Callable<Integer>>();
        for (long id : java.util.List.of(first, second)) calls.add(() -> mvc.perform(patch("/api/habits/" + id)
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":true}")).andReturn().getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200, 409), raceRequests(calls));
        String other = register(UUID.randomUUID() + "@example.com");
        mvc.perform(patch("/api/habits/" + first).header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}")).andExpect(status().isNotFound());
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(10));
    }

    @Test void expiredPremiumKeepsExistingResourcesButBlocksNewSlots() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        long first = createHabit(token);
        for (int i = 0; i < 10; i++) createHabit(token);
        for (int i = 0; i < 4; i++) createGoalForQuota(token);
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.PREMIUM, java.time.Instant.now().minusSeconds(60));
        users.save(user);
        mvc.perform(patch("/api/habits/" + first).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Updated\",\"active\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/habits").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(11));
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(4));
        mvc.perform(post("/api/habits").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Extra\",\"difficulty\":\"MEDIUM\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Extra\",\"targetValue\":10}"))
                .andExpect(status().isConflict());
    }

    @Test void concurrentGoalProgressDoesNotLoseAnUpdate() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long goal = createGoalForQuota(token);
        java.util.concurrent.Callable<Integer> progress = () -> mvc.perform(post("/api/goals/" + goal + "/progress")
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"amount\":2}")).andReturn().getResponse().getStatus();
        org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200, 200), raceRequests(java.util.List.of(progress, progress)));
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].currentValue").value(4));
    }

    @Test void invalidGoalRequestsReturnBadRequestWithoutSaving() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        for (var body : java.util.List.of(
                Map.of("name", " ", "targetValue", 10),
                Map.of("name", "Read", "targetValue", 0),
                Map.of("name", "Read", "targetValue", -1),
                Map.of("name", "Read"),
                Map.of("name", "x".repeat(256), "targetValue", 10),
                Map.of("name", "Read", "targetValue", 10, "deadline", "2026-02-30"))) {
            mvc.perform(post("/api/goals").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));
        long id = createGoalForQuota(token);
        for (String body : java.util.List.of("{}", "{\"amount\":0}", "{\"amount\":-2}", "{\"amount\":2147483648}")) {
            mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        for (String body : java.util.List.of("{\"targetValue\":0}", "{\"name\":\"  \"}", "{\"deadline\":\"invalid\"}")) {
            mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].currentValue").value(0)).andExpect(jsonPath("$[0].targetValue").value(10))
                .andExpect(jsonPath("$[0].name").value("Read books"));
    }

    @Test void loweringGoalTargetCompletesAndReleasesQuotaWithoutReopening() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long id = createGoalForQuota(token);
        createGoalForQuota(token);
        createGoalForQuota(token);
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":8}")).andExpect(status().isOk());
        mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"targetValue\":5}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.currentValue").value(8)).andExpect(jsonPath("$.progress").value(1.0));
        createGoalForQuota(token);
        mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"targetValue\":20}")).andExpect(status().isConflict());
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":1}")).andExpect(status().isConflict());
        mvc.perform(post("/api/goals/" + id + "/abandon").header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
        mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Finished\",\"targetValue\":5}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test void abandonedGoalRejectsProgressAndOtherUsersCannotModifyIt() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long id = createGoalForQuota(token);
        for (int i = 0; i < 2; i++) mvc.perform(post("/api/goals/" + id + "/abandon")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":2147483647}"))
                .andExpect(status().isConflict());
        String other = register(UUID.randomUUID() + "@example.com");
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":1}")).andExpect(status().isNotFound());
        mvc.perform(patch("/api/goals/" + id).header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content("{\"targetValue\":20}")).andExpect(status().isNotFound());
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].status").value("ABANDONED")).andExpect(jsonPath("$[0].currentValue").value(0));
    }

    @Test void progressRequestIdIsAtomicAndRejectsDifferentAmount() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long id = createGoalForQuota(token);
        String key = UUID.randomUUID().toString();
        String body = json.writeValueAsString(Map.of("amount", 2, "requestId", key));
        java.util.concurrent.Callable<Integer> call = () -> mvc.perform(post("/api/goals/" + id + "/progress")
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getStatus();
        org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200, 200), raceRequests(java.util.List.of(call, call)));
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].currentValue").value(2));
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("amount", 3, "requestId", key))))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("amount", 2, "requestId", key.toUpperCase(java.util.Locale.ROOT)))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.currentValue").value(2));
        org.junit.jupiter.api.Assertions.assertEquals(1, accountingDb.queryForObject(
                "select count(*) from goal_progress_receipt where goal_id = ?", Integer.class, id));
    }

    @Test void progressReplayWorksAfterCompletionAndCannotBypassOwnership() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long id = createGoalForQuota(token);
        String body = json.writeValueAsString(Map.of("amount", 10, "requestId", UUID.randomUUID().toString()));
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.currentValue").value(10))
                    .andExpect(jsonPath("$.status").value("COMPLETED"));
        }
        String other = register(UUID.randomUUID() + "@example.com");
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/goals/" + id).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject(
                "select count(*) from goal_progress_receipt where goal_id = ?", Integer.class, id));
        mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());
    }

    @Test void invalidProgressKeyDoesNotWriteAndNewKeysAreDistinctActions() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long id = createGoalForQuota(token);
        for (String key : java.util.List.of("", "not-a-uuid")) {
            mvc.perform(post("/api/goals/" + id + "/progress").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("amount", 2, "requestId", key))))
                    .andExpect(status().isBadRequest());
        }
        for (int i = 0; i < 2; i++) mvc.perform(post("/api/goals/" + id + "/progress")
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("amount", 2, "requestId", UUID.randomUUID().toString()))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/goals").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].currentValue").value(4));
        org.junit.jupiter.api.Assertions.assertEquals(2, accountingDb.queryForObject(
                "select count(*) from goal_progress_receipt where goal_id = ?", Integer.class, id));
    }

    @Test void passwordConfirmationIsRequiredAndMismatchDoesNotRevokeSession() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        for (var body : java.util.List.of(
                Map.of("oldPassword", "password123", "newPassword", "changed123"),
                Map.of("oldPassword", "password123", "newPassword", "changed123", "confirmPassword", "different123"),
                Map.of("oldPassword", "wrong-password", "newPassword", "changed123", "confirmPassword", "changed123"))) {
            mvc.perform(patch("/api/profile/password").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
            mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        }
        mvc.perform(patch("/api/profile/password").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "oldPassword", "password123", "newPassword", "changed123", "confirmPassword", "changed123"))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    @Test void monthlyJournalCopyIsCompleteOwnedAndDateBounded() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var today=userTime.today(users.findByEmail(email).orElseThrow());var month=java.time.YearMonth.from(today).minusMonths(1);
        for(int day=1;day<=month.lengthOfMonth();day++)mvc.perform(post("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",month.atDay(day).toString(),"win","Owned day "+day)))).andExpect(status().isCreated());
        mvc.perform(post("/api/journal").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",month.atDay(1).toString(),"win","FOREIGN_MONTH_SECRET")))).andExpect(status().isCreated());
        mvc.perform(post("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",month.minusMonths(1).atDay(1).toString(),"win","OUTSIDE_MONTH")))).andExpect(status().isCreated());
        var body=mvc.perform(get("/api/journal/month").param("month",month.toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(month.lengthOfMonth())).andExpect(jsonPath("$.items[0].date").value(month.atDay(1).toString())).andExpect(jsonPath("$.observedThrough").value(month.atEndOfMonth().toString())).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("FOREIGN_MONTH_SECRET"));org.junit.jupiter.api.Assertions.assertFalse(body.contains("OUTSIDE_MONTH"));
        mvc.perform(get("/api/journal/month").param("month",java.time.YearMonth.from(today).toString()).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.observedThrough").value(today.toString())).andExpect(jsonPath("$.items.length()").value(0));
        for(String bad:List.of("0000-01","2026-13","2026-1",java.time.YearMonth.from(today).plusMonths(1).toString()))mvc.perform(get("/api/journal/month").param("month",bad).header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/journal/month").param("month",month.toString())).andExpect(status().isUnauthorized());
    }

    @Test void startingGuideUsesOwnedSavedEvidenceThroughAccountToday() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var today=userTime.today(users.findByEmail(email).orElseThrow());long foreign=createHabit(other);checkIn(other,foreign,"COMPLETED","Foreign");mvc.perform(post("/api/journal").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON).content("{\"win\":\"Foreign\"}")).andExpect(status().isCreated());
        mvc.perform(get("/api/getting-started").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.activeHabit").value(false)).andExpect(jsonPath("$.completedCheckIn").value(false)).andExpect(jsonPath("$.journalEntry").value(false)).andExpect(jsonPath("$.observedThrough").value(today.toString()));
        long habit=createHabit(token);checkIn(token,habit,"SKIPPED","Not completed");mvc.perform(get("/api/getting-started").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.activeHabit").value(true)).andExpect(jsonPath("$.completedCheckIn").value(false));
        long completed=createHabit(token);checkIn(token,completed,"COMPLETED","Done");accountingDb.update("update daily_check_in set check_date=? where habit_id=?",today.plusDays(1),completed);
        mvc.perform(get("/api/getting-started").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.completedCheckIn").value(false));accountingDb.update("update daily_check_in set check_date=? where habit_id=?",today.minusDays(1),completed);
        mvc.perform(post("/api/journal").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date",today.minusDays(1).toString(),"win","Saved earlier")))).andExpect(status().isCreated());
        mvc.perform(get("/api/getting-started").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.activeHabit").value(true)).andExpect(jsonPath("$.completedCheckIn").value(true)).andExpect(jsonPath("$.journalEntry").value(true));mvc.perform(get("/api/getting-started")).andExpect(status().isUnauthorized());
    }

    @Test void newCheckInWithNoteIsRetryableAndCannotOverwriteAnotherSavedEntry() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var user=users.findByEmail(email).orElseThrow();var today=userTime.today(user);long habit=createHabit(token),foreign=createHabit(other);var payload=Map.of("habitId",habit,"date",today.toString(),"status","COMPLETED","note","Read outside");
        String first=mvc.perform(post("/api/check-ins/new").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isCreated()).andExpect(jsonPath("$.note").value("Read outside")).andReturn().getResponse().getContentAsString();int balance=rewards.getUserProgress(user).totalXp();
        mvc.perform(post("/api/check-ins/new").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(json.readTree(first).get("id").asLong()));org.junit.jupiter.api.Assertions.assertEquals(balance,rewards.getUserProgress(user).totalXp());
        mvc.perform(post("/api/check-ins/new").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.toString(),"status","FAILED","note","Stale other tab")))).andExpect(status().isConflict());
        mvc.perform(get("/api/check-ins").param("date",today.toString()).header("Authorization","Bearer "+token)).andExpect(jsonPath("$[0].note").value("Read outside")).andExpect(jsonPath("$[0].status").value("COMPLETED"));org.junit.jupiter.api.Assertions.assertEquals(balance,rewards.getUserProgress(user).totalXp());
        mvc.perform(post("/api/check-ins/new").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",foreign,"date",today.toString(),"status","COMPLETED","note","")))).andExpect(status().isNotFound());
        mvc.perform(post("/api/check-ins/new").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.minusDays(1).toString(),"status","COMPLETED","note","")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/check-ins/new").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("habitId",habit,"date",today.toString(),"status","COMPLETED","note","x".repeat(256))))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/check-ins/new").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isUnauthorized());
    }

    @Test void batchCompletionIsAtomicOwnedAndSafeToRetry() throws Exception {
        String email = UUID.randomUUID() + "@example.com", token = register(email), other = register(UUID.randomUUID() + "@example.com");
        var user = users.findByEmail(email).orElseThrow();
        var today = userTime.today(user);
        long first = createHabit(token), second = createHabit(token), foreign = createHabit(other);
        var request = Map.of("date", today.toString(), "habitIds", List.of(first, second));

        mvc.perform(post("/api/check-ins/batch-complete").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.createdCount").value(2))
                .andExpect(jsonPath("$.entries.length()").value(2)).andExpect(jsonPath("$.entries[0].status").value("COMPLETED"));
        int balance = rewards.getUserProgress(user).totalXp();

        // A retry leaves an individually-added note intact and cannot grant XP twice.
        checkIn(token, first, "COMPLETED", "Keep this note");
        mvc.perform(post("/api/check-ins/batch-complete").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.createdCount").value(0))
                .andExpect(jsonPath("$.entries[0].note").value("Keep this note"));
        org.junit.jupiter.api.Assertions.assertEquals(balance, rewards.getUserProgress(user).totalXp());

        long alreadySkipped = createHabit(token), untouched = createHabit(token);
        checkIn(token, alreadySkipped, "SKIPPED", "Saved elsewhere");
        var staleGroup = Map.of("date", today.toString(), "habitIds", List.of(alreadySkipped, untouched));
        mvc.perform(post("/api/check-ins/batch-complete").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(staleGroup)))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(0, accountingDb.queryForObject(
                "select count(*) from daily_check_in where habit_id=? and check_date=?", Integer.class, untouched, java.sql.Date.valueOf(today)));

        mvc.perform(post("/api/check-ins/batch-complete").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date", today.toString(), "habitIds", List.of(foreign)))))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/check-ins/batch-complete").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date", today.toString(), "habitIds", List.of(first, first)))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/check-ins/batch-complete").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("date", today.minusDays(1).toString(), "habitIds", List.of(first)))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/check-ins/batch-complete").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test void habitPauseGroupsAreOwnedAtomicRetryableAndPreserveRecordedXp() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");var user=users.findByEmail(email).orElseThrow();long first=createHabit(token),second=createHabit(token),foreign=createHabit(other);checkIn(token,first,"COMPLETED","Keep history");int balance=rewards.getUserProgress(user).totalXp();
        var active=json.readTree(mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andReturn().getResponse().getContentAsString());var items=new java.util.ArrayList<Map<String,Object>>();for(var row:active)items.add(Map.of("habitId",row.get("id").asLong(),"name",row.get("name").asText(),"difficulty",row.get("difficulty").asText(),"targetPerWeek",row.get("targetPerWeek").asInt()));
        var mixed=new java.util.ArrayList<Map<String,Object>>(items);mixed.add(Map.of("habitId",foreign,"name","Foreign","difficulty","EASY","targetPerWeek",7));mvc.perform(patch("/api/habits/pause-batch").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",mixed)))).andExpect(status().isNotFound());
        var stale=new java.util.ArrayList<Map<String,Object>>(items);var changed=new java.util.HashMap<String,Object>(stale.get(1));changed.put("name","Stale name");stale.set(1,changed);mvc.perform(patch("/api/habits/pause-batch").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",stale)))).andExpect(status().isConflict());mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(2));
        org.junit.jupiter.api.Assertions.assertEquals(2, accountingDb.queryForObject("select count(*) from habit_state_history where habit_id in (?,?)", Integer.class, first, second));
        for(int retry=0;retry<2;retry++)mvc.perform(patch("/api/habits/pause-batch").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",items)))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].active").value(false)).andExpect(jsonPath("$[1].active").value(false));
        org.junit.jupiter.api.Assertions.assertEquals(4, accountingDb.queryForObject("select count(*) from habit_state_history where habit_id in (?,?)", Integer.class, first, second));
        mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(0));mvc.perform(get("/api/check-ins").header("Authorization","Bearer "+token)).andExpect(jsonPath("$[0].note").value("Keep history"));org.junit.jupiter.api.Assertions.assertEquals(balance,rewards.getUserProgress(user).totalXp());
        mvc.perform(patch("/api/habits/pause-batch").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",List.of(items.getFirst(),items.getFirst()))))).andExpect(status().isBadRequest());mvc.perform(patch("/api/habits/pause-batch").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",items)))).andExpect(status().isUnauthorized());
    }

    @Test void pausedHabitRejectsNewActivityButKeepsExistingRecordsCorrectable() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String token = register(email);
        var user = users.findByEmail(email).orElseThrow();
        long habit = createHabit(token);
        var today = userTime.today(user);
        checkIn(token, habit, "COMPLETED", "Recorded before pause");
        // Use a larger quota so the later rejection proves the paused-habit
        // guard, rather than merely the monthly free-tier quota.
        user.activatePremium(com.selfforge.discipline.auth.PremiumTier.LIFETIME, null);
        users.save(user);
        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("habitId", habit, "date", today.toString()))))
                .andExpect(status().isCreated());
        int xpBeforePause = rewards.getUserProgress(user).totalXp();

        mvc.perform(delete("/api/habits/" + habit).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // A stale client must not create fresh progress for a paused habit.
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("habitId", habit, "date", today.minusDays(1).toString(),
                                "status", "COMPLETED", "note", "New after pause"))))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/pomodoro/start").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("habitId", habit, "durationMinutes", 25,
                                "requestId", UUID.randomUUID().toString()))))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/reminders").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("habitId", habit, "reminderTime", "09:30",
                                "daysOfWeek", "MON", "message", "New after pause"))))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/challenges").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("habitId", habit, "name", "New after pause",
                                "targetDays", 1, "requestId", UUID.randomUUID().toString()))))
                .andExpect(status().isConflict());
        // An already-recorded freeze can be retried after a pause without
        // charging the account again, but a new date must be rejected.
        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("habitId", habit, "date", today.toString()))))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/streak-freeze").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("habitId", habit, "date", today.minusDays(1).toString()))))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(xpBeforePause, rewards.getUserProgress(user).totalXp());

        // A pause is not data loss: existing evidence can still receive a correction.
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("habitId", habit, "date", today.toString(),
                                "status", "COMPLETED", "note", "Corrected after pause"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.note").value("Corrected after pause"));
        org.junit.jupiter.api.Assertions.assertEquals(xpBeforePause, rewards.getUserProgress(user).totalXp());
    }

    @Test void habitActivationGroupsRespectCapacityAtomicallyAndAllowSafeRetries() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com"),other=register(UUID.randomUUID()+"@example.com");long first=createHabit(token),second=createHabit(token),foreign=createHabit(other);for(long id:List.of(first,second))mvc.perform(delete("/api/habits/"+id).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        var inactive=json.readTree(mvc.perform(get("/api/habits/inactive").header("Authorization","Bearer "+token)).andReturn().getResponse().getContentAsString());var items=new java.util.ArrayList<Map<String,Object>>();for(var row:inactive)items.add(Map.of("habitId",row.get("id").asLong(),"name",row.get("name").asText(),"difficulty",row.get("difficulty").asText(),"targetPerWeek",row.get("targetPerWeek").asInt()));
        var activeIds=new java.util.ArrayList<Long>();for(int n=0;n<com.selfforge.discipline.auth.PremiumController.FREE_MAX_HABITS;n++)activeIds.add(createHabit(token));
        mvc.perform(delete("/api/habits/"+activeIds.get(0)).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        mvc.perform(patch("/api/habits/activate-batch").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",items)))).andExpect(status().isConflict());
        mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(com.selfforge.discipline.auth.PremiumController.FREE_MAX_HABITS-1));mvc.perform(get("/api/habits/inactive").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(3));
        mvc.perform(delete("/api/habits/"+activeIds.get(1)).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertEquals(4, accountingDb.queryForObject("select count(*) from habit_state_history where habit_id in (?,?)", Integer.class, first, second));
        for(int retry=0;retry<2;retry++)mvc.perform(patch("/api/habits/activate-batch").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",items)))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].active").value(true)).andExpect(jsonPath("$[1].active").value(true));
        org.junit.jupiter.api.Assertions.assertEquals(6, accountingDb.queryForObject("select count(*) from habit_state_history where habit_id in (?,?)", Integer.class, first, second));
        mvc.perform(get("/api/habits").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(com.selfforge.discipline.auth.PremiumController.FREE_MAX_HABITS));
        var mixed=new java.util.ArrayList<Map<String,Object>>(items);mixed.add(Map.of("habitId",foreign,"name","Foreign","difficulty","EASY","targetPerWeek",7));mvc.perform(patch("/api/habits/activate-batch").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",mixed)))).andExpect(status().isNotFound());mvc.perform(patch("/api/habits/activate-batch").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("items",items)))).andExpect(status().isUnauthorized());
    }

    @Test void restartVersionsArchiveMatchingDayRecordsAndReviewsWithoutDuplicatesOrLeaks() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),otherEmail=UUID.randomUUID()+"@example.com",other=register(otherEmail);var owner=users.findByEmail(email).orElseThrow();var today=userTime.today(owner);var steps=List.of("One","Two","Three");
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name","Original","reason","BUSY","start",today.minusDays(4).toString(),"steps",steps,"expectedVersion",0)))).andExpect(status().isOk());
        mvc.perform(put("/api/restart-plan/days").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"planVersion\":1,\"expectedVersion\":0,\"day\":1,\"tried\":true}")).andExpect(status().isOk());
        mvc.perform(put("/api/restart-plan/review").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"planVersion\":1,\"expectedVersion\":0,\"daysTried\":1,\"decision\":\"EASIER\",\"note\":\"Old private review\"}")).andExpect(status().isOk());
        var next=Map.of("name","Next","reason","BUSY","start",today.toString(),"steps",steps,"expectedVersion",1);
        for(int retry=0;retry<2;retry++)mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(next))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
        mvc.perform(get("/api/restart-plan/history").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].snapshot.plan.name").value("Original")).andExpect(jsonPath("$.items[0].snapshot.days.tried[0]").value(true)).andExpect(jsonPath("$.items[0].snapshot.review.note").value("Old private review"));
        mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name","Third","reason","BUSY","start",today.toString(),"steps",steps,"expectedVersion",2)))).andExpect(status().isOk());
        var history=json.readTree(mvc.perform(get("/api/restart-plan/history").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(2)).andReturn().getResponse().getContentAsString());org.junit.jupiter.api.Assertions.assertTrue(history.get("items").get(0).get("snapshot").get("review").isNull());org.junit.jupiter.api.Assertions.assertTrue(history.get("items").get(0).get("snapshot").get("days").isNull());
        for(int version=3;version<=22;version++)mvc.perform(put("/api/restart-plan").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name","Version "+version,"reason","BUSY","start",today.toString(),"steps",steps,"expectedVersion",version)))).andExpect(status().isOk());
        var page=json.readTree(mvc.perform(get("/api/restart-plan/history").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(20)).andReturn().getResponse().getContentAsString());mvc.perform(get("/api/restart-plan/history").param("beforeId",page.get("nextCursor").asText()).header("Authorization","Bearer "+token)).andExpect(jsonPath("$.items.length()").value(2));
        mvc.perform(get("/api/restart-plan/history").header("Authorization","Bearer "+other)).andExpect(jsonPath("$.items.length()").value(0));mvc.perform(get("/api/restart-plan/history")).andExpect(status().isUnauthorized());mvc.perform(get("/api/restart-plan/history").param("beforeId","0").header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/profile/data").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.restart_archive.length()").value(22));
        mvc.perform(delete("/api/profile/account").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("currentPassword","password123","confirmationEmail",email)))).andExpect(status().isNoContent());org.junit.jupiter.api.Assertions.assertEquals(0,accountingDb.queryForObject("select count(*) from restart_archive where user_id=?",Integer.class,owner.getId()));
    }

    @Test void betaFeedbackIsExplicitOwnedExportableAndBounded() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");
        Map<String,Object> report=Map.of("type","BUG","summary","Button did not save","steps","Open Help then submit a report","expected","A clear confirmation","language","en");
        mvc.perform(get("/api/feedback")).andExpect(status().isUnauthorized());
        String created=mvc.perform(post("/api/feedback").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(report)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.type").value("BUG")).andExpect(jsonPath("$.summary").value("Button did not save"))
                .andExpect(jsonPath("$.createdAt").exists()).andReturn().getResponse().getContentAsString();
        long ownId=json.readTree(created).get("id").asLong();
        String foreignBody=mvc.perform(post("/api/feedback").header("Authorization","Bearer "+other).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("type","IDEA","summary","Private foreign idea","steps","Private steps","expected","Private expected","language","vi"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long foreignId=json.readTree(foreignBody).get("id").asLong();
        mvc.perform(get("/api/feedback").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(ownId)).andExpect(jsonPath("$[0].summary").value("Button did not save"));
        mvc.perform(delete("/api/feedback/"+foreignId).header("Authorization","Bearer "+token)).andExpect(status().isNotFound());
        mvc.perform(post("/api/feedback").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"INVALID\",\"summary\":\"bad\",\"language\":\"vi\"}")).andExpect(status().isBadRequest());
        for(int index=0;index<4;index++)mvc.perform(post("/api/feedback").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("type","OTHER","summary","Extra report "+index,"steps","","expected","","language","vi")))).andExpect(status().isCreated());
        mvc.perform(post("/api/feedback").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("type","OTHER","summary","Too many","steps","","expected","","language","vi"))))
                .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After","3600"));
        mvc.perform(get("/api/profile/data").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.feedback_submission.length()").value(5)).andExpect(jsonPath("$.feedback_submission[0].summary").value("Button did not save"));
        mvc.perform(delete("/api/feedback/"+ownId).header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/feedback").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.length()").value(4));
    }

    @Test void weeklyCoachRequiresConsentAndSendsNothingWhileProviderIsDisabled() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email);var today=userTime.today(users.findByEmail(email).orElseThrow());var week=today.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        mvc.perform(get("/api/coach/weekly/status").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.available").value(false)).andExpect(jsonPath("$.journalsIncluded").value(false)).andExpect(jsonPath("$.limit").value(4)).andExpect(jsonPath("$.remaining").value(4));
        mvc.perform(post("/api/coach/weekly").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("weekStart",week.toString(),"consent",false,"language","vi")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/coach/weekly").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("weekStart",week.toString(),"consent",true,"language","vi")))).andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/coach/weekly/status")).andExpect(status().isUnauthorized());
    }

    @Test void dailyFocusCoachRequiresConsentAndKeepsProviderDisabledByDefault() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);
        mvc.perform(get("/api/coach/daily-focus/status").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false)).andExpect(jsonPath("$.limit").value(3)).andExpect(jsonPath("$.remaining").value(3));
        mvc.perform(post("/api/coach/daily-focus").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("budget",60,"energy","MEDIUM","habitIds",List.of(habit),"consent",false,"language","vi")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/coach/daily-focus").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("budget",60,"energy","MEDIUM","habitIds",List.of(habit),"consent",true,"language","vi")))).andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/coach/daily-focus/status")).andExpect(status().isUnauthorized());
    }

    @Test void habitCoachRequiresConsentAndKeepsProviderDisabledByDefault() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");long habit=createHabit(token);
        mvc.perform(get("/api/coach/habit/status").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false)).andExpect(jsonPath("$.limit").value(3)).andExpect(jsonPath("$.remaining").value(3));
        mvc.perform(post("/api/coach/habit").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("question","Why do I miss this?","habitId",habit,"consent",false,"language","en")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/coach/habit").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("question","Why do I miss this?","habitId",habit,"consent",true,"language","en")))).andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/coach/habit/status")).andExpect(status().isUnauthorized());
    }

    @Test void goalCoachRequiresConsentAndSendsNothingWhileProviderIsDisabled() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");long goalId=createGoalForQuota(token);
        mvc.perform(get("/api/coach/goals/"+goalId+"/status").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.available").value(false)).andExpect(jsonPath("$.limit").value(3)).andExpect(jsonPath("$.remaining").value(3));
        mvc.perform(post("/api/coach/goals/"+goalId).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("consent",false,"language","vi")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/coach/goals/"+goalId).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("consent",true,"language","vi")))).andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/coach/goals/"+goalId+"/status")).andExpect(status().isUnauthorized());
    }

    @Test void savedGoalCoachPlanIsScopedToCurrentGoalStateAndCanBeDeletedWithoutAnAiProvider() throws Exception {
        String email=UUID.randomUUID()+"@example.com",token=register(email),other=register(UUID.randomUUID()+"@example.com");long goalId=createGoalForQuota(token);
        var user=users.findByEmail(email).orElseThrow();var goal=goals.findById(goalId).orElseThrow();
        accountingDb.update("insert into goal_coach_plan(user_id,goal_id,language,evidence_fingerprint,headline,steps_json,habits_json,created_at) values (?,?, 'vi', ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                user.getId(),goalId,com.selfforge.discipline.coach.GoalCoachPlanStore.fingerprint(goal),"Bước đầu nhỏ","[\"Đọc một trang\"]","[{\"name\":\"Đọc sau bữa sáng\",\"description\":\"Một trang là đủ\",\"difficulty\":\"EASY\",\"targetPerWeek\":3}]");
        mvc.perform(get("/api/coach/goals/"+goalId+"/advice").param("language","vi").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.headline").value("Bước đầu nhỏ"));
        mvc.perform(post("/api/coach/goals/"+goalId).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"consent\":true,\"language\":\"vi\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.headline").value("Bước đầu nhỏ"));
        mvc.perform(get("/api/coach/goals/"+goalId+"/status").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.remaining").value(3));
        mvc.perform(get("/api/coach/goals/"+goalId+"/advice").param("language","vi").header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/coach/goals/"+goalId+"/advice").param("language","vi").header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/coach/goals/"+goalId+"/advice").param("language","vi").header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
    }

    @Test void restartCoachRequiresConsentAndSendsNothingWhileProviderIsDisabled() throws Exception {
        String token=register(UUID.randomUUID()+"@example.com");
        mvc.perform(get("/api/coach/restart/status").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$.available").value(false)).andExpect(jsonPath("$.limit").value(3)).andExpect(jsonPath("$.remaining").value(3));
        mvc.perform(post("/api/coach/restart").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name","Read","reason","BUSY","consent",false,"language","vi")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/coach/restart").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("name","Read","reason","BUSY","consent",true,"language","vi")))).andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/coach/restart/status")).andExpect(status().isUnauthorized());
    }

    @Test void oauthRoutesRemainSafeUntilAProviderIsConfigured() throws Exception {
        mvc.perform(get("/api/auth/oauth/availability")).andExpect(status().isOk()).andExpect(jsonPath("$.google").value(false)).andExpect(jsonPath("$.facebook").value(false));
        mvc.perform(get("/api/auth/oauth/google/start")).andExpect(status().isServiceUnavailable());
        mvc.perform(post("/api/auth/oauth/google/native/start")).andExpect(status().isServiceUnavailable());
        mvc.perform(post("/api/auth/oauth/google/link/start").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/oauth/google/native/link/start").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
        String token = register(UUID.randomUUID() + "@example.com");
        mvc.perform(post("/api/auth/oauth/google/link/start").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"next\":\"/profile\"}"))
                .andExpect(status().isServiceUnavailable());
        mvc.perform(post("/api/auth/oauth/google/native/link/start").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"next\":\"/profile\"}"))
                .andExpect(status().isServiceUnavailable());
        mvc.perform(post("/api/auth/oauth/complete")).andExpect(status().isUnauthorized()).andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("sf_oauth_ticket=")));
        mvc.perform(post("/api/auth/oauth/native/complete").contentType(MediaType.APPLICATION_JSON).content("{\"handoff\":\"" + "a".repeat(43) + "\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/oauth/native/link/complete").contentType(MediaType.APPLICATION_JSON).content("{\"handoff\":\"" + "a".repeat(43) + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test void securityHeadersAreSetOnEveryResponse() throws Exception {
        // API response must have no-store and CSP
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("X-Request-Id", org.hamcrest.Matchers.matchesPattern("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", "camera=(), microphone=(), geolocation=()"));
        // Static SPA route must have no-cache
        mvc.perform(get("/login"))
                .andExpect(header().string("Cache-Control", "no-cache"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test void manifestHasMaskableIconAndShortcuts() throws Exception {
        mvc.perform(get("/manifest.webmanifest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.display").value("standalone"))
                .andExpect(jsonPath("$.start_url").value("/"))
                .andExpect(jsonPath("$.shortcuts").isArray())
                .andExpect(jsonPath("$.shortcuts[0].url").isNotEmpty())
                .andExpect(jsonPath("$.icons[?(@.purpose == 'maskable')]").exists())
                .andExpect(jsonPath("$.theme_color").isNotEmpty());
    }

    @Test void exportRateLimiterBlocksAfterFiveRequestsPerWindow() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        // Make the user premium so export is accessible
        String email = json.readTree(mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString()).get("email").asText();
        var user = users.findByEmail(email).orElseThrow();
        accountingDb.update("update app_user set premium_tier='PREMIUM', premium_expires_at=? where id=?",
                java.sql.Timestamp.from(java.time.Instant.now().plus(365, java.time.temporal.ChronoUnit.DAYS)), user.getId());
        // 5 requests should succeed
        for (int i = 0; i < 5; i++) {
            mvc.perform(get("/api/export/csv").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
        }
        // 6th request in the same window should be rate limited
        mvc.perform(get("/api/export/csv").header("Authorization", "Bearer " + token))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "300"));
    }

    @Test void checkInRejectedForDateOlderThan90Days() throws Exception {
        String token = register(UUID.randomUUID() + "@example.com");
        long habit = createHabit(token);
        var user = users.findByEmail(json.readTree(mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token)).andReturn().getResponse().getContentAsString())
                .get("email").asText()).orElseThrow();
        var today = userTime.today(user);

        // 90 days ago: still allowed
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "habitId", habit, "status", "COMPLETED",
                        "date", today.minusDays(90).toString()))))
                .andExpect(status().isCreated());

        // 91 days ago: rejected
        mvc.perform(post("/api/check-ins").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "habitId", habit, "status", "COMPLETED",
                        "date", today.minusDays(91).toString()))))
                .andExpect(status().isBadRequest());
    }

    @Test void registerIsRateLimitedAfterTooManyAttempts() throws Exception {
        String email = "ratelimit-register-" + UUID.randomUUID() + "@example.com";
        // First registration succeeds
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "email", email, "displayName", "Tester",
                        "password", "password123", "termsAccepted", true))))
                .andExpect(status().isCreated());
        // Spam the same email until rate limited (limit is 10/min)
        int tooManyRequests = 0;
        for (int i = 0; i < 12; i++) {
            int status = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of(
                            "email", email, "displayName", "Spammer",
                            "password", "password123", "termsAccepted", true))))
                    .andReturn().getResponse().getStatus();
            if (status == 429) tooManyRequests++;
        }
        org.junit.jupiter.api.Assertions.assertTrue(tooManyRequests > 0,
                "Register endpoint must be rate-limited after repeated attempts with the same email");
    }
}
