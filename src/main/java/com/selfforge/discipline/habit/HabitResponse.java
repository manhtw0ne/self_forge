package com.selfforge.discipline.habit;

import java.time.Instant;

public record HabitResponse(
        Long id,
        String name,
        String description,
        Difficulty difficulty,
        int targetPerWeek,
        String scheduledDays,
        int points,
        boolean active,
        Long categoryId,
        String categoryName,
        String categoryColor,
        String tags,
        int sortOrder,
        String stackGroup,
        Instant createdAt
) {
    public static HabitResponse from(Habit habit) {
        var category = habit.getCategory();
        boolean canReadCategory = category != null && (category.isSystemDefault()
                || (habit.getUser() != null && category.getUser().getId().equals(habit.getUser().getId())));
        return new HabitResponse(
                habit.getId(),
                habit.getName(),
                habit.getDescription(),
                habit.getDifficulty(),
                habit.getTargetPerWeek(),
                habit.getScheduledDays(),
                habit.getPoints(),
                habit.isActive(),
                canReadCategory ? habit.getCategory().getId() : null,
                canReadCategory ? habit.getCategory().getName() : null,
                canReadCategory ? habit.getCategory().getColor() : null,
                habit.getTags(),
                habit.getSortOrder(),
                habit.getStackGroup(),
                habit.getCreatedAt()
        );
    }
}
