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
        Instant createdAt
) {
    static ChallengeResponse from(Challenge challenge) {
        return new ChallengeResponse(
                challenge.getId(),
                challenge.getHabit().getId(),
                challenge.getHabit().getName(),
                challenge.getName(),
                challenge.getDescription(),
                challenge.getStartDate(),
                challenge.getEndDate(),
                challenge.getTargetDays(),
                challenge.getStatus(),
                challenge.getCreatedAt()
        );
    }
}
