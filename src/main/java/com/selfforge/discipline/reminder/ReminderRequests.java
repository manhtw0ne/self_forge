package com.selfforge.discipline.reminder;

import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public final class ReminderRequests {

    private ReminderRequests() {
    }

    public record CreateReminderRequest(
            @NotNull Long habitId,
            @NotNull LocalTime reminderTime,
            @NotNull @jakarta.validation.constraints.Size(max = 27)
            @jakarta.validation.constraints.Pattern(regexp = "(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*") String daysOfWeek,
            @jakarta.validation.constraints.Size(max = 255) String message,
            java.util.UUID requestId
    ) {
    }

    public record ReminderSnapshot(@NotNull LocalTime reminderTime,
        @NotNull @jakarta.validation.constraints.Size(max=27) @jakarta.validation.constraints.Pattern(regexp="(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*") String daysOfWeek,
        @jakarta.validation.constraints.Size(max=255) String message,@NotNull Boolean enabled){}

    public record UpdateReminderRequest(
            LocalTime reminderTime,
            @jakarta.validation.constraints.Size(max = 27)
            @jakarta.validation.constraints.Pattern(regexp = "(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*") String daysOfWeek,
            @jakarta.validation.constraints.Size(max = 255) String message,
            Boolean enabled, @jakarta.validation.Valid ReminderSnapshot expected
    ) {
    }
}
