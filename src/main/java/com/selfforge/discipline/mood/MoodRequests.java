package com.selfforge.discipline.mood;

import java.time.LocalDate;

public final class MoodRequests {

    private MoodRequests() {
    }

    public record SaveMoodRequest(
            LocalDate date,
            int score,
            String emoji,
            String note
    ) {
    }
}
