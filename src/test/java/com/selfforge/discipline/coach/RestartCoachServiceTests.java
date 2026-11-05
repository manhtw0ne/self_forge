package com.selfforge.discipline.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RestartCoachServiceTests {
    private final ObjectMapper json = new ObjectMapper();

    @Test void providerInputContainsOnlyActivityAndSelectedReason() {
        Map<String, Object> input = RestartCoachService.providerInput("Read books", "BUSY");
        assertEquals("Read books", input.get("activity"));
        assertEquals("BUSY", input.get("reason"));
        assertFalse(input.containsKey("journal"));
        assertFalse(input.containsKey("notes"));
        assertFalse(input.containsKey("email"));
        assertFalse(input.containsKey("identity"));
        assertFalse(input.containsKey("steps"));
    }

    @Test void providerReplyMustContainExactlyThreeBoundedSteps() throws Exception {
        String content = json.writeValueAsString(Map.of("steps", List.of("Read one page.", "Repeat it tomorrow.", "Review and choose whether to continue.")));
        var response = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", content))))));
        assertEquals(3, RestartCoachService.parse(response).steps().size());
        String invalid = json.writeValueAsString(Map.of("steps", List.of("Only one.")));
        var invalidResponse = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", invalid))))));
        assertThrows(IllegalArgumentException.class, () -> RestartCoachService.parse(invalidResponse));
    }
}
