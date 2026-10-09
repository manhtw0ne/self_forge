package com.selfforge.discipline.dashboard;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.checkin.CheckInResponse;
import com.selfforge.discipline.checkin.CheckInService;
import com.selfforge.discipline.checkin.DailyCheckIn;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitRepository;
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

    public DashboardService(HabitRepository habitRepository, CheckInService checkInService, UserTime userTime) {
        this.userTime = userTime;
        this.habitRepository = habitRepository;
        this.checkInService = checkInService;
    }

    public DashboardResponse today(AppUser user, LocalDate date) {
        LocalDate selectedDate = date == null ? userTime.today(user) : date;
        LocalDate weekStart = selectedDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<Habit> habits = habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId());
        Map<Long, CheckInResponse> todayCheckIns = checkInService.listByDate(user, selectedDate).stream()
                .collect(Collectors.toMap(CheckInResponse::habitId, Function.identity()));
        List<DailyCheckIn> weekCheckIns = checkInService.listBetween(user, weekStart, selectedDate);

        int todayScore = todayCheckIns.values().stream().mapToInt(CheckInResponse::scoreImpact).sum();
        int weekScore = weekCheckIns.stream().mapToInt(DailyCheckIn::scoreImpact).sum();
        int weeklyTarget = habits.stream().mapToInt(Habit::getTargetPerWeek).sum();
        long completedThisWeek = weekCheckIns.stream().filter(DailyCheckIn::isCompleted).count();
        double weekCompletionRate = weeklyTarget == 0 ? 0 : Math.min(1, completedThisWeek / (double) weeklyTarget);

        List<DashboardResponse.HabitProgress> progress = habits.stream()
                .map(habit -> new DashboardResponse.HabitProgress(
                        habit.getId(),
                        habit.getName(),
                        habit.getDifficulty(),
                        habit.getPoints(),
                        habit.getTargetPerWeek(),
                        checkInService.completedThisWeek(user, habit.getId(), selectedDate),
                        checkInService.currentStreak(user, habit.getId(), selectedDate),
                        todayCheckIns.containsKey(habit.getId()) ? todayCheckIns.get(habit.getId()).status() : null
                ))
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
}
