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
            @jakarta.validation.constraints.Size(max = 255) String tags,
            @jakarta.validation.constraints.Size(max = 27) String scheduledDays
    ) {
        public CreateHabitRequest(String name, String description, Difficulty difficulty, Integer targetPerWeek,
                                  Integer points, Long categoryId, String tags) {
            this(name, description, difficulty, targetPerWeek, points, categoryId, tags, null);
        }
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
            Boolean clearCategory,
            @jakarta.validation.Valid HabitSnapshot expected,
            @jakarta.validation.constraints.Size(max = 27) String scheduledDays
    ) {
        // Kept for server-side callers compiled against the previous request shape.
        public UpdateHabitRequest(String name, String description, Difficulty difficulty, Integer targetPerWeek,
                                  Integer points, Boolean active, Long categoryId, String tags,
                                  Boolean clearCategory) {
            this(name, description, difficulty, targetPerWeek, points, active, categoryId, tags, clearCategory, null, null);
        }
    }

    /**
     * The editable state the client saw before opening an edit form. It makes a stale browser tab
     * fail safely instead of silently overwriting a newer edit from another device.
     */
    public record HabitSnapshot(
            @NotBlank @jakarta.validation.constraints.Size(max = 255) String name,
            @jakarta.validation.constraints.Size(max = 255) String description,
            @jakarta.validation.constraints.NotNull Difficulty difficulty,
            @jakarta.validation.constraints.NotNull @Min(1) @Max(7) Integer targetPerWeek,
            @jakarta.validation.constraints.NotNull @Min(1) Integer points,
            @jakarta.validation.constraints.NotNull Boolean active,
            @jakarta.validation.constraints.Positive Long categoryId,
            @jakarta.validation.constraints.Size(max = 255) String tags,
            @jakarta.validation.constraints.Size(max = 27) String scheduledDays
    ) {
    }
}

