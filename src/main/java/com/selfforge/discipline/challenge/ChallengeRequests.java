package com.selfforge.discipline.challenge;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public final class ChallengeRequests {

    private ChallengeRequests() {
    }

    public record CreateChallengeRequest(
            @NotNull Long habitId,
            @NotBlank String name,
            String description,
            LocalDate startDate,
            @Min(1) @Max(365) Integer targetDays
    ) {
    }

    public record UpdateChallengeStatusRequest(
            @NotNull ChallengeStatus status
    ) {
    }
}
