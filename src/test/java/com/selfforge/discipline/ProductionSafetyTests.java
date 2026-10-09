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
    @Autowired org.springframework.jdbc.core.JdbcTemplate accountingDb;

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
        var result = mvc.perform(get("/api/profile/data").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.profile.email").value(email))
                .andExpect(jsonPath("$.habit.length()").value(1))
                .andExpect(jsonPath("$.check_ins.length()").value(1))
                .andExpect(jsonPath("$.check_ins[0].note").value("Owner history"))
                .andExpect(jsonPath("$.journal_entry[0].win").value("Private journal"))
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
        org.junit.jupiter.api.Assertions.assertEquals(8, upgraded.migrate().migrationsExecuted);
        var row = accountingDb.queryForMap("select note, applied_xp, points_snapshot from " + schemaSql + ".daily_check_in where id = 1");
        org.junit.jupiter.api.Assertions.assertEquals("Keep me", row.get("note"));
        org.junit.jupiter.api.Assertions.assertNull(row.get("applied_xp"));
        org.junit.jupiter.api.Assertions.assertNull(row.get("points_snapshot"));
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
}
