package com.selfforge.discipline.dashboard;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.checkin.CheckInResponse;
import com.selfforge.discipline.checkin.CheckInService;
import com.selfforge.discipline.checkin.DailyCheckIn;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitRepository;
import com.selfforge.discipline.habit.HabitSchedule;
import com.selfforge.discipline.habit.HabitStateHistory;
import com.selfforge.discipline.habit.HabitStateHistoryRepository;
import com.selfforge.discipline.habit.HabitStateTimeline;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final UserTime userTime;

    private final HabitRepository habitRepository;
    private final CheckInService checkInService;
    private final HabitStateHistoryRepository stateHistory;

    public DashboardService(HabitRepository habitRepository, CheckInService checkInService, UserTime userTime,
                            HabitStateHistoryRepository stateHistory) {
        this.userTime = userTime;
        this.habitRepository = habitRepository;
        this.checkInService = checkInService;
        this.stateHistory = stateHistory;
    }

    public DashboardResponse today(AppUser user, LocalDate date) {
        LocalDate selectedDate = date == null ? userTime.today(user) : date;
        LocalDate weekStart = selectedDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<Habit> habits = habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId());
        Map<Long, HabitStateHistory> recordedStateOnDate = habits.isEmpty() ? Map.of() : HabitStateTimeline.latestForHabits(
                stateHistory.statesOnOrBefore(habits.stream().map(Habit::getId).toList(), selectedDate), selectedDate);
        Map<Long, CheckInResponse> todayCheckIns = checkInService.listByDate(user, selectedDate).stream()
                .collect(Collectors.toMap(CheckInResponse::habitId, Function.identity()));
        List<DailyCheckIn> weekCheckIns = checkInService.listBetween(user, weekStart, selectedDate);

        int todayScore = todayCheckIns.values().stream().mapToInt(CheckInResponse::scoreImpact).sum();
        int weekScore = weekCheckIns.stream().mapToInt(DailyCheckIn::scoreImpact).sum();
        int weeklyTarget = habits.stream().mapToInt(Habit::getTargetPerWeek).sum();
        long completedThisWeek = weekCheckIns.stream().filter(DailyCheckIn::isCompleted).count();
        // The dashboard already loaded the account's week once. Reuse that
        // bounded result for every visible habit instead of issuing one extra
        // completed-this-week query per card (an N+1 pattern for Premium
        // accounts with many habits).
        Map<Long, Long> completedByHabit = weekCheckIns.stream()
                .filter(DailyCheckIn::isCompleted)
                .collect(Collectors.groupingBy(checkIn -> checkIn.getHabit().getId(), Collectors.counting()));
        Map<Long, Long> recordedSetbacks = weekCheckIns.stream()
                .filter(checkIn -> checkIn.getStatus() == com.selfforge.discipline.checkin.CheckInStatus.SKIPPED
                        || checkIn.getStatus() == com.selfforge.discipline.checkin.CheckInStatus.FAILED)
                .collect(Collectors.groupingBy(checkIn -> checkIn.getHabit().getId(), Collectors.counting()));
        double weekCompletionRate = weeklyTarget == 0 ? 0 : Math.min(1, completedThisWeek / (double) weeklyTarget);

        List<DashboardResponse.HabitProgress> progress = habits.stream()
                .map(habit -> habitProgress(user, selectedDate, habit, recordedStateOnDate.get(habit.getId()),
                        completedByHabit, recordedSetbacks, todayCheckIns))
                .toList();

        return new DashboardResponse(
                selectedDate,
                habits.size(),
                todayScore,
                weekScore,
                weekCompletionRate,
                progress
        );
    }

    private DashboardResponse.HabitProgress habitProgress(AppUser user, LocalDate selectedDate, Habit habit,
                                                            HabitStateHistory stateOnDate,
                                                            Map<Long, Long> completedByHabit,
                                                            Map<Long, Long> recordedSetbacks,
                                                            Map<Long, CheckInResponse> checkInsForDate) {
        String schedule = stateOnDate == null ? habit.getScheduledDays() : stateOnDate.getScheduledDays();
        boolean scheduled = (stateOnDate == null || stateOnDate.isActive())
                && HabitSchedule.includes(schedule, selectedDate);
        return new DashboardResponse.HabitProgress(
                habit.getId(),
                habit.getName(),
                habit.getDifficulty(),
                habit.getPoints(),
                habit.getTargetPerWeek(),
                schedule,
                scheduled,
                completedByHabit.getOrDefault(habit.getId(), 0L).intValue(),
                recordedSetbacks.getOrDefault(habit.getId(), 0L).intValue(),
                checkInService.currentStreak(user, habit.getId(), selectedDate, habit.getTargetPerWeek(), habit.getScheduledDays()),
                checkInsForDate.containsKey(habit.getId()) ? checkInsForDate.get(habit.getId()).status() : null
        );
    }
}
