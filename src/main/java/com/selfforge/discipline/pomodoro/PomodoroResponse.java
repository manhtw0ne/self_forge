package com.selfforge.discipline.pomodoro;

import java.time.Instant;

public record PomodoroResponse(
        Long id,
        Long habitId,
        String habitName,
        int durationMinutes,
        boolean completed,
        String note,
        Instant startedAt,
        Instant endedAt
) {
    static PomodoroResponse from(PomodoroSession session) {
        return new PomodoroResponse(
                session.getId(),
                session.getHabit() != null ? session.getHabit().getId() : null,
                session.getHabit() != null ? session.getHabit().getName() : null,
                session.getDurationMinutes(),
                session.isCompleted(),
                session.getNote(),
                session.getStartedAt(),
                session.getEndedAt()
        );
    }
}
