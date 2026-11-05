package com.selfforge.discipline.checkin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public final class CheckInRequests {

    private CheckInRequests() {
    }

    public record CheckInSnapshot(@NotNull @Positive Long id, @NotNull CheckInStatus status, @Size(max = 255) String note) { }

    public record UpsertCheckInRequest(
            @NotNull Long habitId,
            LocalDate date,
            @NotNull CheckInStatus status,
            @Size(max = 255) String note,
            @Valid CheckInSnapshot expected
    ) {
        public UpsertCheckInRequest(Long habitId, LocalDate date, CheckInStatus status, String note) {
            this(habitId, date, status, note, null);
        }
    }

    /**
     * A deliberately narrow bulk action for the daily dashboard.  It can only
     * mark explicitly selected habits as completed; skipped and failed states
     * still require an intentional per-habit check-in.
     */
    public record CompleteCheckInsRequest(
            @NotNull LocalDate date,
            @NotEmpty @Size(max = 50) List<@NotNull @Positive Long> habitIds
    ) { }
}
