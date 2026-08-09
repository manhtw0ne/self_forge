package com.selfforge.discipline.checkin;

import java.time.Instant;
import java.time.LocalDate;

public record CheckInResponse(
        Long id,
        Long habitId,
        String habitName,
        LocalDate date,
        CheckInStatus status,
        int scoreImpact,
        String note,
        Instant createdAt
) {
    public static CheckInResponse from(DailyCheckIn checkIn) {
        return new CheckInResponse(
                checkIn.getId(),
                checkIn.getHabit().getId(),
                checkIn.getHabit().getName(),
                checkIn.getDate(),
                checkIn.getStatus(),
                checkIn.scoreImpact(),
                checkIn.getNote(),
                checkIn.getCreatedAt()
        );
    }
}
