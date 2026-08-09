package com.selfforge.discipline.habit;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public final class HabitRequests {

    private HabitRequests() {
    }

    public record CreateHabitRequest(
            @NotBlank String name,
            String description,
            Difficulty difficulty,
            @Min(1) @Max(7) Integer targetPerWeek,
            @Min(1) Integer points,
            Long categoryId,
            String tags
    ) {
    }

    public record UpdateHabitRequest(
            String name,
            String description,
            Difficulty difficulty,
            @Min(1) @Max(7) Integer targetPerWeek,
            @Min(1) Integer points,
            Boolean active,
            Long categoryId,
            String tags
    ) {
    }
}

