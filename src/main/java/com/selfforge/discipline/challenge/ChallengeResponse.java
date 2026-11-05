package com.selfforge.discipline.challenge;

import java.time.Instant;
import java.time.LocalDate;

public record ChallengeResponse(
        Long id,
        Long habitId,
        String habitName,
        String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        int targetDays,
        ChallengeStatus status,
        Instant createdAt,
        int completedDays,
        int remainingDays,
        double completionRate
) {
    static ChallengeResponse from(Challenge challenge, ChallengeStatus resolvedStatus, int completedDays) {
        return new ChallengeResponse(
                challenge.getId(),
                challenge.getHabit().getId(),
                challenge.getHabit().getName(),
                challenge.getName(),
                challenge.getDescription(),
                challenge.getStartDate(),
                challenge.getEndDate(),
                challenge.getTargetDays(),
                resolvedStatus,
                challenge.getCreatedAt(),
                completedDays,
                Math.max(0, challenge.getTargetDays() - completedDays),
                challenge.getTargetDays() <= 0 ? 0 : Math.min(1, completedDays / (double) challenge.getTargetDays())
        );
    }
}
