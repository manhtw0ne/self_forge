package com.selfforge.discipline.mood;

import java.time.LocalDate;

public final class MoodRequests {

    private MoodRequests() {
    }

    public record MoodSnapshot(@jakarta.validation.constraints.Positive Long id,@jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) int score,@jakarta.validation.constraints.Size(max=255) String emoji,@jakarta.validation.constraints.Size(max=255) String note) {}

    public record DeleteMoodRequest(@jakarta.validation.constraints.NotNull LocalDate date,@jakarta.validation.Valid @jakarta.validation.constraints.NotNull MoodSnapshot expected) {}

    public record SaveMoodRequest(
            LocalDate date,
            @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(5) int score,
            @jakarta.validation.constraints.Size(max = 255) String emoji,
            @jakarta.validation.constraints.Size(max = 255) String note,
            @jakarta.validation.Valid MoodSnapshot expected
    ) {
    }
}
