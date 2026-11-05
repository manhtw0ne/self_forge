package com.selfforge.discipline.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.habit.Difficulty;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class HabitCoachServiceTests {
    private final ObjectMapper json = new ObjectMapper();
    private final HabitCoachService.HabitSummary habit = new HabitCoachService.HabitSummary(
            12L, "Read after breakfast", Difficulty.EASY, 4, 28, 8, 2, 1);

    @Test void providerInputContainsOnlyQuestionAndExplicitAggregateHabitSummary() {
        Map<String, Object> input = HabitCoachService.providerInput("Why does this feel difficult?", habit);
        assertEquals("Why does this feel difficult?", input.get("question"));
        assertTrue(input.containsKey("selectedHabit"));
        for (String forbidden : java.util.List.of("journal", "email", "notes", "identity", "goals", "reminders", "xp", "streak")) {
            assertFalse(input.containsKey(forbidden));
        }
        assertEquals("Why does this feel difficult?", HabitCoachService.question(" Why does this feel difficult? "));
        assertThrows(IllegalArgumentException.class, () -> HabitCoachService.question("no"));
    }

    @Test void providerReplyIsBoundedAndRequiresBothEditableFields() throws Exception {
        String content = json.writeValueAsString(Map.of("answer", "Try lowering the first step for a few days.",
                "experiment", "Read one page after breakfast for three days."));
        var response = json.readTree(json.writeValueAsString(Map.of("choices", java.util.List.of(Map.of("message", Map.of("content", content))))));
        assertEquals("Read one page after breakfast for three days.", HabitCoachService.parse(response).experiment());

        String invalidContent = json.writeValueAsString(Map.of("answer", "Only one field"));
        var invalid = json.readTree(json.writeValueAsString(Map.of("choices", java.util.List.of(Map.of("message", Map.of("content", invalidContent))))));
        assertThrows(IllegalArgumentException.class, () -> HabitCoachService.parse(invalid));
    }
}
