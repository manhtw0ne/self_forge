package com.selfforge.discipline.coach;

import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.insight.WeeklyInsightService;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class WeeklyCoachAdviceStoreTests {
    private WeeklyInsightService.Snapshot snapshot(String habitName, int completed) {
        return new WeeklyInsightService.Snapshot(1, LocalDate.parse("2026-10-12"), LocalDate.parse("2026-10-18"),
                LocalDate.parse("2026-10-18"), "Asia/Ho_Chi_Minh", completed, 0, 0, 1, 25,
                List.of(new WeeklyInsightService.Evidence(7L, LocalDate.parse("2026-10-12"), CheckInStatus.COMPLETED, 3L, habitName)),
                List.of(4L), "KEEP_SMALL_STEP");
    }

    @Test void evidenceFingerprintIsStableForTheSameSummaryAndChangesWithVisibleEvidence() {
        assertEquals(WeeklyCoachAdviceStore.fingerprint(snapshot("Read", 1)), WeeklyCoachAdviceStore.fingerprint(snapshot("Read", 1)));
        assertNotEquals(WeeklyCoachAdviceStore.fingerprint(snapshot("Read", 1)), WeeklyCoachAdviceStore.fingerprint(snapshot("Walk", 1)));
        assertNotEquals(WeeklyCoachAdviceStore.fingerprint(snapshot("Read", 1)), WeeklyCoachAdviceStore.fingerprint(snapshot("Read", 2)));
    }
}
