package com.selfforge.discipline.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.insight.WeeklyInsightService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class WeeklyCoachServiceTests {
    private final ObjectMapper json = new ObjectMapper();
    private final WeeklyInsightService.Snapshot snapshot = new WeeklyInsightService.Snapshot(1,
            LocalDate.parse("2026-10-12"), LocalDate.parse("2026-10-18"), LocalDate.parse("2026-10-18"), "Asia/Ho_Chi_Minh",
            1, 1, 0, 1, 25,
            List.of(new WeeklyInsightService.Evidence(7L, LocalDate.parse("2026-10-12"), CheckInStatus.COMPLETED, 3L, "Read"),
                    new WeeklyInsightService.Evidence(8L, LocalDate.parse("2026-10-13"), CheckInStatus.FAILED, 3L, "Read")),
            List.of(4L), "KEEP_SMALL_STEP");

    @Test void providerInputUsesAggregateEvidenceAndNeverAddsPrivateContent() {
        Map<String, Object> input = WeeklyCoachService.providerInput(snapshot);
        assertEquals("2026-10-12", input.get("weekStart"));
        assertTrue(input.containsKey("habits"));
        assertFalse(input.containsKey("journal"));
        assertFalse(input.containsKey("notes"));
        assertFalse(input.containsKey("email"));
        assertFalse(input.containsKey("identity"));
    }

    @Test void providerReplyMustReferenceOnlyEvidenceBackedHabits() throws Exception {
        String content = json.writeValueAsString(Map.of("headline", "Try a smaller reading step.",
                "observations", List.of(Map.of("habitId", 3, "text", "One recorded result can be a reason to experiment.")),
                "experiments", List.of("Read one page after breakfast for three days.")));
        var response = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", content))))));
        assertEquals(3L, WeeklyCoachService.parse(response, snapshot).observations().getFirst().habitId());
        String invented = json.writeValueAsString(Map.of("headline", "Invented", "observations", List.of(Map.of("habitId", 99, "text", "Unknown")), "experiments", List.of("Try it.")));
        var invalid = json.readTree(json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", invented))))));
        assertThrows(IllegalArgumentException.class, () -> WeeklyCoachService.parse(invalid, snapshot));
    }
}
