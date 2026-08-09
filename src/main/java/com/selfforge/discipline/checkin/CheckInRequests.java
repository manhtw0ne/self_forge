package com.selfforge.discipline.checkin;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public final class CheckInRequests {

    private CheckInRequests() {
    }

    public record UpsertCheckInRequest(
            @NotNull Long habitId,
            LocalDate date,
            @NotNull CheckInStatus status,
            String note
    ) {
    }
}
