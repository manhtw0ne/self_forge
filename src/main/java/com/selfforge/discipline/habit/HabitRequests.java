package com.selfforge.discipline.habit;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public final class HabitRequests {

    private HabitRequests() {
    }

    public record CreateHabitRequest(
            @NotBlank @jakarta.validation.constraints.Size(max = 255) String name,
            @jakarta.validation.constraints.Size(max = 255) String description,
            Difficulty difficulty,
            @Min(1) @Max(7) Integer targetPerWeek,
            @Min(1) Integer points,
            @jakarta.validation.constraints.Positive Long categoryId,
            @jakarta.validation.constraints.Size(max = 255) String tags
    ) {
    }

    public record UpdateHabitRequest(
            @jakarta.validation.constraints.Size(max = 255) String name,
            @jakarta.validation.constraints.Size(max = 255) String description,
            Difficulty difficulty,
            @Min(1) @Max(7) Integer targetPerWeek,
            @Min(1) Integer points,
            Boolean active,
            @jakarta.validation.constraints.Positive Long categoryId,
            @jakarta.validation.constraints.Size(max = 255) String tags,
            Boolean clearCategory
    ) {
    }
}

