package com.selfforge.discipline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:discipline-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class DisciplineApiApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void canCreateHabitCheckInAndReadDashboard() throws Exception {
        String registerJson = """
                {
                  "email": "student@example.com",
                  "displayName": "Java Student",
                  "password": "password123",
                  "termsAccepted": true
                }
                """;

        String authResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.user.email").value("student@example.com"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String token = objectMapper.readTree(authResponse).get("token").asText();
        String habitJson = """
                {
                  "name": "Hoc Java 30 phut",
                  "description": "Hoc Spring Boot va viet code moi ngay",
                  "difficulty": "MEDIUM",
                  "targetPerWeek": 6
                }
                """;

        String response = mockMvc.perform(post("/api/habits")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(habitJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Hoc Java 30 phut"))
                .andExpect(jsonPath("$.points").value(10))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdHabit = objectMapper.readTree(response);
        long habitId = createdHabit.get("id").asLong();
        String checkInJson = """
                {
                  "habitId": %d,
                  "status": "COMPLETED",
                  "note": "Hoan thanh bai dau tien"
                }
                """.formatted(habitId);

        mockMvc.perform(post("/api/check-ins")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkInJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.scoreImpact").value(10));

        mockMvc.perform(get("/api/dashboard/today")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeHabitCount").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.todayScore").value(greaterThanOrEqualTo(10)));

        String challengeJson = """
                {
                  "habitId": %d,
                  "name": "7 ngay hoc Java",
                  "targetDays": 7
                }
                """.formatted(habitId);

        String challengeResponse = mockMvc.perform(post("/api/challenges")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(challengeJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("7 ngay hoc Java"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long challengeId = objectMapper.readTree(challengeResponse).get("id").asLong();

        mockMvc.perform(get("/api/challenges/" + challengeId + "/progress")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedDays").value(1))
                .andExpect(jsonPath("$.remainingDays").value(6));
    }

    @Test
    void habitApiRequiresAuthToken() throws Exception {
        mockMvc.perform(get("/api/habits"))
                .andExpect(status().isUnauthorized());
    }
}
