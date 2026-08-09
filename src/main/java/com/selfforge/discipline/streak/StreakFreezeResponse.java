package com.selfforge.discipline.streak;

import java.time.LocalDate;

public record StreakFreezeResponse(
        Long id,
        Long habitId,
        String habitName,
        LocalDate freezeDate
) {
    static StreakFreezeResponse from(StreakFreeze freeze) {
        return new StreakFreezeResponse(
                freeze.getId(),
                freeze.getHabit().getId(),
                freeze.getHabit().getName(),
                freeze.getFreezeDate()
        );
    }
}
