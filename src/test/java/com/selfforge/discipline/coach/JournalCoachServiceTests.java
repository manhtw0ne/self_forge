package com.selfforge.discipline.coach;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class JournalCoachServiceTests {
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void providerInputContainsOnlyTheExplicitlySelectedJournalFields() {
        var entry = JournalCoachService.entry("Finished a page", "Low energy", "Start smaller", "Read after breakfast");
        Map<String, Object> input = JournalCoachService.providerInput(entry);

        assertTrue(input.containsKey("journal"));
        assertFalse(input.containsKey("email"));
        assertFalse(input.containsKey("identity"));
        assertFalse(input.containsKey("checkIns"));
        assertFalse(input.containsKey("habits"));
        assertFalse(input.containsKey("reminders"));
    }

    @Test
    void entryMustHaveTextAndStayWithinProviderBudget() {
        assertThrows(IllegalArgumentException.class, () -> JournalCoachService.entry("", null, "", ""));
        assertThrows(IllegalArgumentException.class,
                () -> JournalCoachService.entry("x".repeat(JournalCoachService.MAX_FIELD_CHARACTERS + 1), "", "", ""));
    }

    @Test
    void providerReplyMustContainThreeShortEditableFields() throws Exception {
        String content = json.writeValueAsString(Map.of("reflection", "A smaller start may be worth trying.",
                "question", "What made the small step easier to begin?", "tomorrowAction", "Read one page after breakfast."));
        var response = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", content))))));
        assertEquals("Read one page after breakfast.", JournalCoachService.parse(response).tomorrowAction());

        String invalidContent = json.writeValueAsString(Map.of("reflection", "Only one field"));
        var invalid = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", invalidContent))))));
        assertThrows(IllegalArgumentException.class, () -> JournalCoachService.parse(invalid));
    }
}
