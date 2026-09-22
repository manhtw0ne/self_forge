package com.selfforge.discipline.reward;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckIn;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class RewardService {

    private final UserLevelRepository userLevelRepository;
    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final DailyCheckInRepository checkInRepository;
    private final HabitRepository habitRepository;

    public RewardService(
            UserLevelRepository userLevelRepository,
            AchievementRepository achievementRepository,
            UserAchievementRepository userAchievementRepository,
            DailyCheckInRepository checkInRepository,
            HabitRepository habitRepository
    ) {
        this.userLevelRepository = userLevelRepository;
        this.achievementRepository = achievementRepository;
        this.userAchievementRepository = userAchievementRepository;
        this.checkInRepository = checkInRepository;
        this.habitRepository = habitRepository;
    }

    public void addXp(AppUser user, int amount) {
        UserLevel level = getOrCreateLevel(user);
        level.addXp(amount);
    }

    public void deductXp(AppUser user, int amount) {
        UserLevel level = getOrCreateLevel(user);
        level.deductXp(amount);
    }

    public void checkAndGrantAchievements(AppUser user) {
        LocalDate today = LocalDate.now();

        // Check streak-based achievements for each habit
        List<Habit> habits = habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId());
        for (Habit habit : habits) {
            int streak = computeStreak(user, habit.getId(), today);
            if (streak >= 7) {
                grantIfNew(user, "STREAK_7");
            }
            if (streak >= 21) {
                grantIfNew(user, "STREAK_21");
            }
            if (streak >= 30) {
                grantIfNew(user, "STREAK_30");
            }
            if (streak >= 60) {
                grantIfNew(user, "STREAK_60");
            }
            if (streak >= 100) {
                grantIfNew(user, "STREAK_100");
            }
        }

        // Check perfect week
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        if (today.getDayOfWeek() == DayOfWeek.SUNDAY || today.equals(weekStart.plusDays(6))) {
            int totalTarget = habits.stream().mapToInt(Habit::getTargetPerWeek).sum();
            long completed = checkInRepository
                    .findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), weekStart, today)
                    .stream()
                    .filter(c -> c.getStatus() == CheckInStatus.COMPLETED)
                    .count();
            if (totalTarget > 0 && completed >= totalTarget) {
                grantIfNew(user, "PERFECT_WEEK");
            }
        }

        // Check total check-in milestones
        long totalCompleted = checkInRepository
                .findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), LocalDate.of(2000, 1, 1), today)
                .stream()
                .filter(c -> c.getStatus() == CheckInStatus.COMPLETED)
                .count();
        if (totalCompleted >= 10) grantIfNew(user, "TOTAL_10");
        if (totalCompleted >= 50) grantIfNew(user, "TOTAL_50");
        if (totalCompleted >= 100) grantIfNew(user, "TOTAL_100");
        if (totalCompleted >= 500) grantIfNew(user, "TOTAL_500");
        if (totalCompleted >= 1000) grantIfNew(user, "TOTAL_1000");

        // Early bird: check if there's a habit completed today
        if (!checkInRepository.findByHabit_User_IdAndDateOrderByCreatedAtAsc(user.getId(), today).isEmpty()) {
            grantIfNew(user, "FIRST_CHECKIN");
        }
    }

    public RewardResponse.UserProgressResponse getUserProgress(AppUser user) {
        UserLevel level = getOrCreateLevel(user);
        double progress = level.getNextLevelXp() == 0 ? 1.0 :
                level.getCurrentLevelXp() / (double) level.getNextLevelXp();

        List<RewardResponse.EarnedAchievement> recent = userAchievementRepository
                .findByUserIdOrderByEarnedAtDesc(user.getId())
                .stream()
                .limit(10)
                .map(RewardResponse.EarnedAchievement::from)
                .toList();

        return new RewardResponse.UserProgressResponse(
                level.getLevel(),
                level.getTotalXp(),
                level.getCurrentLevelXp(),
                level.getNextLevelXp(),
                progress,
                recent
        );
    }

    @Transactional(readOnly = true)
    public List<RewardResponse.AchievementListItem> getAllAchievements(AppUser user) {
        List<Achievement> all = achievementRepository.findAll();
        Set<String> earnedCodes = userAchievementRepository.findByUserIdOrderByEarnedAtDesc(user.getId())
                .stream()
                .map(ua -> ua.getAchievement().getCode())
                .collect(Collectors.toSet());

        Map<String, java.time.Instant> earnedMap = userAchievementRepository
                .findByUserIdOrderByEarnedAtDesc(user.getId())
                .stream()
                .collect(Collectors.toMap(
                        ua -> ua.getAchievement().getCode(),
                        UserAchievement::getEarnedAt,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        return all.stream()
                .map(a -> new RewardResponse.AchievementListItem(
                        a.getId(),
                        a.getCode(),
                        a.getName(),
                        a.getDescription(),
                        a.getXpReward(),
                        a.getIconEmoji(),
                        earnedCodes.contains(a.getCode()),
                        earnedMap.get(a.getCode())
                ))
                .toList();
    }

    private UserLevel getOrCreateLevel(AppUser user) {
        return userLevelRepository.findByUserId(user.getId())
                .orElseGet(() -> userLevelRepository.save(new UserLevel(user)));
    }

    private void grantIfNew(AppUser user, String achievementCode) {
        if (userAchievementRepository.existsByUserIdAndAchievementCode(user.getId(), achievementCode)) {
            return;
        }
        achievementRepository.findByCode(achievementCode).ifPresent(achievement -> {
            userAchievementRepository.save(new UserAchievement(user, achievement));
            addXp(user, achievement.getXpReward());
        });
    }

    private int computeStreak(AppUser user, Long habitId, LocalDate today) {
        List<LocalDate> completedDates = checkInRepository
                .findByHabit_User_IdAndHabitIdAndStatusAndDateIn(
                        user.getId(), habitId, CheckInStatus.COMPLETED,
                        today.minusDays(100).datesUntil(today.plusDays(1)).toList()
                )
                .stream()
                .map(DailyCheckIn::getDate)
                .toList();

        Set<LocalDate> dateSet = new java.util.HashSet<>(completedDates);
        LocalDate cursor = dateSet.contains(today) ? today : today.minusDays(1);
        int streak = 0;
        while (dateSet.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }
}
