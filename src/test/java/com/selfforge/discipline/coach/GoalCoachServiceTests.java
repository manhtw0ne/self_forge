package com.selfforge.discipline.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.goal.Goal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class GoalCoachServiceTests {
    private final ObjectMapper json = new ObjectMapper();
    private final Goal goal = new Goal(new AppUser("person@example.com", "Person", "hash"),
            "Read books", "Finish twelve books", 12, "books", java.time.LocalDate.parse("2026-12-31"));

    @Test void providerInputContainsOnlyTheSelectedGoalFields() {
        Map<String, Object> input = GoalCoachService.providerInput(goal);
        assertTrue(input.containsKey("goal"));
        assertFalse(input.containsKey("journal"));
        assertFalse(input.containsKey("notes"));
        assertFalse(input.containsKey("email"));
        assertFalse(input.containsKey("identity"));
        assertFalse(input.containsKey("habits"));
    }

    @Test void providerReplyHasStrictBoundedHabitFields() throws Exception {
        String content = json.writeValueAsString(Map.of("headline", "Start with a small reading rhythm.",
                "steps", List.of("Choose one short book for this month."),
                "habits", List.of(Map.of("name", "Read one page", "description", "Read after breakfast.",
                        "difficulty", "EASY", "targetPerWeek", 3))));
        var response = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", content))))));
        assertEquals("EASY", GoalCoachService.parse(response).habits().getFirst().difficulty().name());
        String invalidDifficulty = json.writeValueAsString(Map.of("headline", "Invalid", "steps", List.of("Try."),
                "habits", List.of(Map.of("name", "Read", "description", "Try.", "difficulty", "EXTREME", "targetPerWeek", 3))));
        var invalid = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", invalidDifficulty))))));
        assertThrows(IllegalArgumentException.class, () -> GoalCoachService.parse(invalid));
    }
}
