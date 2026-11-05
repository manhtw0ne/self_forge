package com.selfforge.discipline.reminder;

import java.time.Instant;
import java.time.LocalTime;

public record ReminderResponse(
        Long id,
        Long habitId,
        String habitName,
        LocalTime reminderTime,
        String daysOfWeek,
        String message,
        boolean enabled,
        boolean habitActive,
        String habitScheduledDays,
        Instant createdAt
) {
    public static ReminderResponse from(Reminder reminder) {
        return new ReminderResponse(
                reminder.getId(),
                reminder.getHabit().getId(),
                reminder.getHabit().getName(),
                reminder.getReminderTime(),
                reminder.getDaysOfWeek(),
                reminder.getMessage(),
                reminder.isEnabled(),
                reminder.getHabit().isActive(),
                reminder.getHabit().getScheduledDays(),
                reminder.getCreatedAt()
        );
    }
}
