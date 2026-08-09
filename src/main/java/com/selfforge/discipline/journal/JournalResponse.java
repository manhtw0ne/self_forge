package com.selfforge.discipline.journal;

import java.time.Instant;
import java.time.LocalDate;

public record JournalResponse(
        Long id,
        LocalDate date,
        String win,
        String obstacle,
        String lesson,
        String tomorrowFocus,
        Instant createdAt
) {
    static JournalResponse from(JournalEntry entry) {
        return new JournalResponse(
                entry.getId(),
                entry.getDate(),
                entry.getWin(),
                entry.getObstacle(),
                entry.getLesson(),
                entry.getTomorrowFocus(),
                entry.getCreatedAt()
        );
    }
}
