package com.selfforge.discipline.streak;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.auth.PremiumController;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.HabitService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@Transactional
public class StreakFreezeService {
    private final UserTime userTime;
    private final StreakFreezeRepository freezeRepository;
    private final HabitService habitService;
    private final AppUserRepository users;

    public StreakFreezeService(StreakFreezeRepository freezeRepository, HabitService habitService,
                               UserTime userTime, AppUserRepository users) {
        this.freezeRepository = freezeRepository;
        this.habitService = habitService;
        this.userTime = userTime;
        this.users = users;
    }

    public StreakFreezeResponse useFreeze(AppUser user, Long habitId, LocalDate date) {
        users.lockById(user.getId()).orElseThrow();
        var now = userTime.now(user);
        LocalDate today = now.toLocalDate();
        LocalDate freezeDate = date == null ? today : date;
        if (freezeDate.isBefore(today.minusDays(1)) || freezeDate.isAfter(today)) {
            throw new IllegalArgumentException("Chỉ có thể freeze hôm nay hoặc hôm qua");
        }
        // Check ownership before revealing whether this habit has already been frozen.
        var habit = habitService.getHabit(user, habitId);
        var existing = freezeRepository.findByUserIdAndHabitIdAndFreezeDate(user.getId(), habitId, freezeDate);
        if (existing.isPresent()) return StreakFreezeResponse.from(existing.get());
        int max = maxFreezes(user);
        if (usedInMonth(user, YearMonth.from(today)) >= max) {
            throw new IllegalStateException("Đã hết lượt bảo vệ streak tháng này (tối đa " + max + "/tháng)");
        }
        return StreakFreezeResponse.from(freezeRepository.save(new StreakFreeze(user, habit, freezeDate, now.toInstant())));
    }

    public int maxFreezes(AppUser user) {
        return user.isPremium() ? PremiumController.PREMIUM_FREEZE_PER_MONTH : PremiumController.FREE_FREEZE_PER_MONTH;
    }

    @Transactional(readOnly = true)
    public int remainingFreezes(AppUser user) {
        return Math.max(0, maxFreezes(user) - usedInMonth(user, YearMonth.from(userTime.today(user))));
    }

    @Transactional(readOnly = true)
    public boolean isFrozen(Long userId, Long habitId, LocalDate date) {
        return freezeRepository.existsByUserIdAndHabitIdAndFreezeDate(userId, habitId, date);
    }

    @Transactional(readOnly = true)
    public List<StreakFreezeResponse> history(AppUser user) {
        YearMonth ym = YearMonth.from(userTime.today(user));
        return freezeRepository.findByUserIdAndFreezeDateBetweenOrderByFreezeDateDesc(user.getId(), ym.atDay(1), ym.atEndOfMonth())
                .stream().map(StreakFreezeResponse::from).toList();
    }

    private int usedInMonth(AppUser user, YearMonth month) {
        // Charge the month the action was used, even when freezing yesterday in a previous month.
        var start = userTime.day(user, month.atDay(1)).start();
        var end = userTime.day(user, month.plusMonths(1).atDay(1)).start();
        return freezeRepository.countByUserIdAndUsedAtGreaterThanEqualAndUsedAtLessThan(user.getId(), start, end);
    }
}