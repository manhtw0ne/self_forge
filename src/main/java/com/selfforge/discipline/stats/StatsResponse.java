package com.selfforge.discipline.stats;

import com.selfforge.discipline.checkin.CheckInStatus;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public final class StatsResponse {

    private StatsResponse() {
    }

    public record WeeklyStatsResponse(
            LocalDate weekStart,
            LocalDate weekEnd,
            int totalScore,
            int completedCount,
            int failedCount,
            int skippedCount,
            double completionRate,
            int bestStreak,
            HabitStat mostConsistentHabit,
            HabitStat leastConsistentHabit,
            List<DayBreakdown> dailyBreakdown
    ) {
    }

    public record MonthlyStatsResponse(
            YearMonth month,
            int totalScore,
            int completedCount,
            int failedCount,
            int skippedCount,
            double completionRate,
            int activeDays,
            int totalDays,
            Double previousMonthCompletionRate,
            double trend,
            List<HabitStat> habitStats
    ) {
    }

    public record HeatmapDayResponse(
            int year,
            List<HeatmapDay> days
    ) {
    }

    public record HabitStat(
            Long habitId,
            String habitName,
            int completedCount,
            int totalExpected,
            double completionRate
    ) {
    }

    public record DayBreakdown(
            LocalDate date,
            int completedCount,
            int totalHabits,
            int score
    ) {
    }

    public record HeatmapDay(
            LocalDate date,
            int completedCount,
            int score
    ) {
    }
}
