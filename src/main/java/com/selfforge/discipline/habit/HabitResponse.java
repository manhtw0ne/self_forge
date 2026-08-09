package com.selfforge.discipline.habit;

import java.time.Instant;

public record HabitResponse(
        Long id,
        String name,
        String description,
        Difficulty difficulty,
        int targetPerWeek,
        int points,
        boolean active,
        Long categoryId,
        String categoryName,
        String categoryColor,
        String tags,
        Instant createdAt
) {
    static HabitResponse from(Habit habit) {
        return new HabitResponse(
                habit.getId(),
                habit.getName(),
                habit.getDescription(),
                habit.getDifficulty(),
                habit.getTargetPerWeek(),
                habit.getPoints(),
                habit.isActive(),
                habit.getCategory() != null ? habit.getCategory().getId() : null,
                habit.getCategory() != null ? habit.getCategory().getName() : null,
                habit.getCategory() != null ? habit.getCategory().getColor() : null,
                habit.getTags(),
                habit.getCreatedAt()
        );
    }
}

