package com.selfforge.discipline.mood;

import java.time.LocalDate;

public record MoodResponse(
        Long id,
        LocalDate date,
        int score,
        String emoji,
        String note
) {
    static MoodResponse from(MoodEntry entry) {
        return new MoodResponse(
                entry.getId(),
                entry.getDate(),
                entry.getScore(),
                entry.getEmoji(),
                entry.getNote()
        );
    }
}
