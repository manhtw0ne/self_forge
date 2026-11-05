package com.selfforge.discipline.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.auth.AuthRequests.LoginRequest;
import com.selfforge.discipline.auth.AuthService;
import com.selfforge.discipline.auth.PasswordHasher;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.insight.WeeklyInsightService;
import java.time.Instant;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:weekly-coach-feedback;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class WeeklyCoachFeedbackHttpTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordHasher passwords;
    @Autowired AuthService auth;
    @Autowired UserTime userTime;
    @Autowired WeeklyInsightService insights;
    @Autowired WeeklyCoachAdviceRepository advice;

    @Test void owner_can_rate_choose_next_step_and_clear_only_their_current_weekly_suggestion() throws Exception {
        AppUser owner = user();
        AppUser other = user();
        String ownerToken = token(owner);
        String otherToken = token(other);
        var snapshot = seed(owner);

        mvc.perform(put("/api/coach/weekly/advice/feedback").header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                "weekStart", snapshot.weekStart().toString(), "language", "vi", "helpfulnessRating", 4))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.helpfulnessRating").value(4))
                .andExpect(jsonPath("$.followUpDecision").doesNotExist());
        mvc.perform(put("/api/coach/weekly/advice/feedback").header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                "weekStart", snapshot.weekStart().toString(), "language", "vi", "followUpDecision", "WILL_TRY"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.helpfulnessRating").value(4))
                .andExpect(jsonPath("$.followUpDecision").value("WILL_TRY"));
        mvc.perform(get("/api/coach/weekly/advice").header("Authorization", "Bearer " + ownerToken)
                        .param("weekStart", snapshot.weekStart().toString()).param("language", "vi"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.helpfulnessRating").value(4))
                .andExpect(jsonPath("$.followUpDecision").value("WILL_TRY"))
                .andExpect(jsonPath("$.email").doesNotExist());

        mvc.perform(put("/api/coach/weekly/advice/feedback").header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                "weekStart", snapshot.weekStart().toString(), "language", "vi", "helpfulnessRating", 5))))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/coach/weekly/advice/feedback").header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                                "weekStart", snapshot.weekStart().toString(), "language", "vi"))))
                .andExpect(status().isBadRequest());

        mvc.perform(delete("/api/coach/weekly/advice/feedback").header("Authorization", "Bearer " + ownerToken)
                        .param("weekStart", snapshot.weekStart().toString()).param("language", "vi"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/coach/weekly/advice").header("Authorization", "Bearer " + ownerToken)
                        .param("weekStart", snapshot.weekStart().toString()).param("language", "vi"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.helpfulnessRating").doesNotExist())
                .andExpect(jsonPath("$.followUpDecision").doesNotExist());
    }

    private AppUser user() {
        return users.save(new AppUser(UUID.randomUUID() + "@example.com", "Beta tester", passwords.hash("password123")));
    }

    private String token(AppUser user) {
        return auth.login(new LoginRequest(user.getEmail(), "password123")).token();
    }

    private WeeklyInsightService.Snapshot seed(AppUser user) {
        var snapshot = insights.summarize(user, userTime.today(user));
        advice.saveAndFlush(new WeeklyCoachAdvice(user, snapshot.weekStart(), "vi", WeeklyCoachAdviceStore.fingerprint(snapshot),
                "Try a small step.", "[{\"habitId\":1,\"text\":\"A recorded pattern can be a prompt to experiment.\"}]",
                "[\"Try one smaller step this week.\"]", Instant.now()));
        return snapshot;
    }
}
