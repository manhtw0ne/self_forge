package com.selfforge.discipline.checkin;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitService;
import com.selfforge.discipline.penalty.PenaltyService;
import com.selfforge.discipline.reward.RewardService;
import com.selfforge.discipline.streak.StreakFreezeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static com.selfforge.discipline.checkin.CheckInRequests.UpsertCheckInRequest;

@Service
@Transactional
public class CheckInService {

    private final DailyCheckInRepository checkInRepository;
    private final HabitService habitService;
    private final RewardService rewardService;
    private final PenaltyService penaltyService;
    private final StreakFreezeService streakFreezeService;

    public CheckInService(DailyCheckInRepository checkInRepository, HabitService habitService,
                          RewardService rewardService, PenaltyService penaltyService,
                          StreakFreezeService streakFreezeService) {
        this.checkInRepository = checkInRepository;
        this.habitService = habitService;
        this.rewardService = rewardService;
        this.penaltyService = penaltyService;
        this.streakFreezeService = streakFreezeService;
    }

    public CheckInResponse upsert(AppUser user, UpsertCheckInRequest request) {
        LocalDate date = request.date() == null ? LocalDate.now() : request.date();
        Habit habit = habitService.getHabit(user, request.habitId());
        DailyCheckIn checkIn = checkInRepository.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), date)
                .map(existing -> {
                    existing.update(request.status(), request.note());
                    return existing;
                })
                .orElseGet(() -> checkInRepository.save(new DailyCheckIn(habit, date, request.status(), request.note())));

        // Grant XP and check achievements on completion
        if (request.status() == CheckInStatus.COMPLETED) {
            rewardService.addXp(user, habit.getPoints());
            rewardService.checkAndGrantAchievements(user);
        }

        // Apply penalty on failure
        if (request.status() == CheckInStatus.FAILED) {
            int previousStreak = currentStreak(user, habit.getId(), date.minusDays(1));
            if (previousStreak >= 7) {
                penaltyService.applyStreakBreakPenalty(user, habit, previousStreak);
            }
            penaltyService.applyFailPenalty(user, habit);
        }

        return CheckInResponse.from(checkIn);
    }

    @Transactional(readOnly = true)
    public List<CheckInResponse> listByDate(AppUser user, LocalDate date) {
        LocalDate selectedDate = date == null ? LocalDate.now() : date;
        return checkInRepository.findByHabit_User_IdAndDateOrderByCreatedAtAsc(user.getId(), selectedDate).stream()
                .map(CheckInResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DailyCheckIn> listBetween(AppUser user, LocalDate start, LocalDate end) {
        return checkInRepository.findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), start, end);
    }

    @Transactional(readOnly = true)
    public int currentStreak(AppUser user, Long habitId, LocalDate today) {
        Set<LocalDate> completedDates = new HashSet<>(checkInRepository
                .findByHabit_User_IdAndHabitIdAndStatusAndDateIn(
                        user.getId(),
                        habitId,
                        CheckInStatus.COMPLETED,
                        lastHundredDays(today)
                )
                .stream()
                .map(DailyCheckIn::getDate)
                .toList());

        LocalDate cursor = completedDates.contains(today) ? today : today.minusDays(1);
        int streak = 0;
        while (completedDates.contains(cursor) || streakFreezeService.isFrozen(user.getId(), habitId, cursor)) {
            if (completedDates.contains(cursor)) {
                streak++;
            }
            // Frozen dates don't add to streak count but don't break it either
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    @Transactional(readOnly = true)
    public int completedThisWeek(AppUser user, Long habitId, LocalDate today) {
        LocalDate start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return checkInRepository
                .findByHabit_User_IdAndHabitIdAndStatusAndDateBetween(
                        user.getId(),
                        habitId,
                        CheckInStatus.COMPLETED,
                        start,
                        today
                )
                .size();
    }

    private List<LocalDate> lastHundredDays(LocalDate today) {
        return today.minusDays(100).datesUntil(today.plusDays(1)).toList();
    }
}
