package com.selfforge.discipline.penalty;

import java.time.Instant;
import java.time.LocalDate;

public record PenaltyResponse(
        Long id,
        Long habitId,
        String habitName,
        PenaltyType type,
        int xpDeducted,
        String reason,
        LocalDate date,
        Instant createdAt
) {
    public static PenaltyResponse from(Penalty penalty) {
        return new PenaltyResponse(
                penalty.getId(),
                penalty.getHabit() != null ? penalty.getHabit().getId() : null,
                penalty.getHabit() != null ? penalty.getHabit().getName() : null,
                penalty.getType(),
                penalty.getXpDeducted(),
                penalty.getReason(),
                penalty.getDate(),
                penalty.getCreatedAt()
        );
    }
}
