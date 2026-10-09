package com.selfforge.discipline.stats;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckIn;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Year;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StatsService {

    private final UserTime userTime;

    private final DailyCheckInRepository checkInRepository;
    private final HabitRepository habitRepository;

    public StatsService(DailyCheckInRepository checkInRepository, HabitRepository habitRepository, UserTime userTime) {
        this.userTime = userTime;
        this.checkInRepository = checkInRepository;
        this.habitRepository = habitRepository;
    }

    public StatsResponse.WeeklyStatsResponse weeklyStats(AppUser user, LocalDate date) {
        LocalDate selectedDate = date == null ? userTime.today(user) : date;
        LocalDate weekStart = selectedDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);

        List<Habit> activeHabits = habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId());
        List<DailyCheckIn> checkIns = checkInRepository
                .findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), weekStart, weekEnd);

        int completedCount = (int) checkIns.stream().filter(c -> c.getStatus() == CheckInStatus.COMPLETED).count();
        int failedCount = (int) checkIns.stream().filter(c -> c.getStatus() == CheckInStatus.FAILED).count();
        int skippedCount = (int) checkIns.stream().filter(c -> c.getStatus() == CheckInStatus.SKIPPED).count();
        int totalScore = checkIns.stream().mapToInt(DailyCheckIn::scoreImpact).sum();
        int totalExpected = activeHabits.stream().mapToInt(Habit::getTargetPerWeek).sum();
        double completionRate = totalExpected == 0 ? 0 : Math.min(1.0, completedCount / (double) totalExpected);

        // Best streak within the week
        int bestStreak = computeBestStreakInRange(checkIns);

        // Per-habit stats
        Map<Long, List<DailyCheckIn>> byHabit = checkIns.stream()
                .collect(Collectors.groupingBy(c -> c.getHabit().getId()));
        List<StatsResponse.HabitStat> habitStats = activeHabits.stream()
                .map(h -> {
                    List<DailyCheckIn> habitCheckins = byHabit.getOrDefault(h.getId(), List.of());
                    int hCompleted = (int) habitCheckins.stream()
                            .filter(c -> c.getStatus() == CheckInStatus.COMPLETED).count();
                    int hExpected = h.getTargetPerWeek();
                    double hRate = hExpected == 0 ? 0 : Math.min(1.0, hCompleted / (double) hExpected);
                    return new StatsResponse.HabitStat(h.getId(), h.getName(), hCompleted, hExpected, hRate);
                })
                .toList();

        StatsResponse.HabitStat mostConsistent = habitStats.stream()
                .max(Comparator.comparingDouble(StatsResponse.HabitStat::completionRate))
                .orElse(null);
        StatsResponse.HabitStat leastConsistent = habitStats.stream()
                .min(Comparator.comparingDouble(StatsResponse.HabitStat::completionRate))
                .orElse(null);

        // Daily breakdown
        List<StatsResponse.DayBreakdown> dailyBreakdown = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate day = weekStart.plusDays(i);
            List<DailyCheckIn> dayCheckins = checkIns.stream()
                    .filter(c -> c.getDate().equals(day))
                    .toList();
            int dayCompleted = (int) dayCheckins.stream()
                    .filter(c -> c.getStatus() == CheckInStatus.COMPLETED).count();
            int dayScore = dayCheckins.stream().mapToInt(DailyCheckIn::scoreImpact).sum();
            dailyBreakdown.add(new StatsResponse.DayBreakdown(day, dayCompleted, activeHabits.size(), dayScore));
        }

        return new StatsResponse.WeeklyStatsResponse(
                weekStart, weekEnd, totalScore,
                completedCount, failedCount, skippedCount,
                completionRate, bestStreak,
                mostConsistent, leastConsistent,
                dailyBreakdown
        );
    }

    public StatsResponse.MonthlyStatsResponse monthlyStats(AppUser user, YearMonth month) {
        YearMonth selectedMonth = month == null ? YearMonth.from(userTime.today(user)) : month;
        LocalDate monthStart = selectedMonth.atDay(1);
        LocalDate monthEnd = selectedMonth.atEndOfMonth();

        List<Habit> activeHabits = habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId());
        List<DailyCheckIn> checkIns = checkInRepository
                .findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), monthStart, monthEnd);

        int completedCount = (int) checkIns.stream().filter(c -> c.getStatus() == CheckInStatus.COMPLETED).count();
        int failedCount = (int) checkIns.stream().filter(c -> c.getStatus() == CheckInStatus.FAILED).count();
        int skippedCount = (int) checkIns.stream().filter(c -> c.getStatus() == CheckInStatus.SKIPPED).count();
        int totalScore = checkIns.stream().mapToInt(DailyCheckIn::scoreImpact).sum();

        Set<LocalDate> activeDays = checkIns.stream()
                .filter(c -> c.getStatus() == CheckInStatus.COMPLETED)
                .map(DailyCheckIn::getDate)
                .collect(Collectors.toSet());

        int totalDays = selectedMonth.lengthOfMonth();
        int weeksInMonth = (totalDays + 6) / 7;
        int totalExpected = activeHabits.stream().mapToInt(Habit::getTargetPerWeek).sum() * weeksInMonth;
        double completionRate = totalExpected == 0 ? 0 : Math.min(1.0, completedCount / (double) totalExpected);

        // Previous month comparison
        YearMonth prevMonth = selectedMonth.minusMonths(1);
        LocalDate prevStart = prevMonth.atDay(1);
        LocalDate prevEnd = prevMonth.atEndOfMonth();
        List<DailyCheckIn> prevCheckIns = checkInRepository
                .findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), prevStart, prevEnd);
        int prevCompleted = (int) prevCheckIns.stream()
                .filter(c -> c.getStatus() == CheckInStatus.COMPLETED).count();
        int prevWeeks = (prevMonth.lengthOfMonth() + 6) / 7;
        int prevExpected = activeHabits.stream().mapToInt(Habit::getTargetPerWeek).sum() * prevWeeks;
        Double prevRate = prevExpected == 0 ? null : Math.min(1.0, prevCompleted / (double) prevExpected);
        double trend = prevRate == null ? 0 : completionRate - prevRate;

        // Per-habit stats
        Map<Long, List<DailyCheckIn>> byHabit = checkIns.stream()
                .collect(Collectors.groupingBy(c -> c.getHabit().getId()));
        List<StatsResponse.HabitStat> habitStats = activeHabits.stream()
                .map(h -> {
                    List<DailyCheckIn> habitCheckins = byHabit.getOrDefault(h.getId(), List.of());
                    int hCompleted = (int) habitCheckins.stream()
                            .filter(c -> c.getStatus() == CheckInStatus.COMPLETED).count();
                    int hExpected = h.getTargetPerWeek() * weeksInMonth;
                    double hRate = hExpected == 0 ? 0 : Math.min(1.0, hCompleted / (double) hExpected);
                    return new StatsResponse.HabitStat(h.getId(), h.getName(), hCompleted, hExpected, hRate);
                })
                .toList();

        return new StatsResponse.MonthlyStatsResponse(
                selectedMonth, totalScore,
                completedCount, failedCount, skippedCount,
                completionRate, activeDays.size(), totalDays,
                prevRate, trend, habitStats
        );
    }

    public StatsResponse.HeatmapDayResponse heatmap(AppUser user, Year year) {
        Year selectedYear = year == null ? Year.from(userTime.today(user)) : year;
        LocalDate yearStart = selectedYear.atDay(1);
        LocalDate yearEnd = selectedYear.atMonth(12).atEndOfMonth();

        List<DailyCheckIn> checkIns = checkInRepository
                .findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), yearStart, yearEnd);

        Map<LocalDate, List<DailyCheckIn>> byDate = checkIns.stream()
                .collect(Collectors.groupingBy(DailyCheckIn::getDate));

        List<StatsResponse.HeatmapDay> days = new ArrayList<>();
        LocalDate cursor = yearStart;
        LocalDate today = userTime.today(user);
        LocalDate limit = yearEnd.isAfter(today) ? today : yearEnd;
        while (!cursor.isAfter(limit)) {
            List<DailyCheckIn> dayCheckIns = byDate.getOrDefault(cursor, List.of());
            int completed = (int) dayCheckIns.stream()
                    .filter(c -> c.getStatus() == CheckInStatus.COMPLETED).count();
            int score = dayCheckIns.stream().mapToInt(DailyCheckIn::scoreImpact).sum();
            days.add(new StatsResponse.HeatmapDay(cursor, completed, score));
            cursor = cursor.plusDays(1);
        }

        return new StatsResponse.HeatmapDayResponse(selectedYear.getValue(), days);
    }

    private int computeBestStreakInRange(List<DailyCheckIn> checkIns) {
        Set<LocalDate> completedDates = checkIns.stream()
                .filter(c -> c.getStatus() == CheckInStatus.COMPLETED)
                .map(DailyCheckIn::getDate)
                .collect(Collectors.toCollection(HashSet::new));
        if (completedDates.isEmpty()) {
            return 0;
        }

        List<LocalDate> sorted = completedDates.stream().sorted().toList();
        int best = 1;
        int current = 1;
        for (int i = 1; i < sorted.size(); i++) {
            if (sorted.get(i).equals(sorted.get(i - 1).plusDays(1))) {
                current++;
                best = Math.max(best, current);
            } else {
                current = 1;
            }
        }
        return best;
    }
}
