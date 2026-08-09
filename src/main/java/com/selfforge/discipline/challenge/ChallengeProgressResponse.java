package com.selfforge.discipline.challenge;

import java.time.LocalDate;

public record ChallengeProgressResponse(
        Long challengeId,
        String name,
        Long habitId,
        String habitName,
        LocalDate startDate,
        LocalDate endDate,
        int targetDays,
        int completedDays,
        int remainingDays,
        double completionRate,
        ChallengeStatus status
) {
}
