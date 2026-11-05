package com.selfforge.discipline.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.habit.Difficulty;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DailyFocusCoachServiceTests {
    private final ObjectMapper json = new ObjectMapper();
    private final List<DailyFocusCoachService.FocusHabit> habits = List.of(
            new DailyFocusCoachService.FocusHabit(11L, "Read a page", Difficulty.EASY, 4),
            new DailyFocusCoachService.FocusHabit(22L, "Practice drawing", Difficulty.MEDIUM, 3));

    @Test void providerInputContainsOnlyExplicitlySelectedFocusFields() {
        Map<String, Object> input = DailyFocusCoachService.providerInput(60, "MEDIUM", habits);
        assertEquals(60, input.get("availableMinutes"));
        assertTrue(input.containsKey("selectedHabits"));
        assertFalse(input.containsKey("journal"));
        assertFalse(input.containsKey("email"));
        assertFalse(input.containsKey("notes"));
        assertFalse(input.containsKey("checkIns"));
    }

    @Test void providerReplyMustRankEverySelectedHabitExactlyOnce() throws Exception {
        String content = json.writeValueAsString(Map.of("headline", "Begin with a small reading step.",
                "priorityHabitIds", List.of(22, 11)));
        var response = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", content))))));
        assertEquals(List.of(22L, 11L), DailyFocusCoachService.parse(response, List.of(11L, 22L)).priorityHabitIds());

        String missing = json.writeValueAsString(Map.of("headline", "Missing one.", "priorityHabitIds", List.of(11)));
        var invalid = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", missing))))));
        assertThrows(IllegalArgumentException.class, () -> DailyFocusCoachService.parse(invalid, List.of(11L, 22L)));
    }
}
