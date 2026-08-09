package com.selfforge.discipline.reminder;

import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public final class ReminderRequests {

    private ReminderRequests() {
    }

    public record CreateReminderRequest(
            @NotNull Long habitId,
            @NotNull LocalTime reminderTime,
            String daysOfWeek,
            String message
    ) {
    }

    public record UpdateReminderRequest(
            LocalTime reminderTime,
            String daysOfWeek,
            String message,
            Boolean enabled
    ) {
    }
}
