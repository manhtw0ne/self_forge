package com.selfforge.discipline.dashboard;

import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.habit.Difficulty;

import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        LocalDate date,
        int activeHabitCount,
        int todayScore,
        int weekScore,
        double weekCompletionRate,
        List<HabitProgress> habits
) {
    public record HabitProgress(
            Long habitId,
            String name,
            Difficulty difficulty,
            int points,
            int targetPerWeek,
            String scheduledDays,
            boolean scheduledToday,
            int completedThisWeek,
            int recordedSetbacksThisWeek,
            int currentStreak,
            CheckInStatus todayStatus
    ) {
    }
}
