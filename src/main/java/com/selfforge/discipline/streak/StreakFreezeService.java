package com.selfforge.discipline.streak;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@Transactional
public class StreakFreezeService {

    private static final int MAX_FREEZES_PER_MONTH = 2;

    private final StreakFreezeRepository freezeRepository;
    private final HabitService habitService;

    public StreakFreezeService(StreakFreezeRepository freezeRepository, HabitService habitService) {
        this.freezeRepository = freezeRepository;
        this.habitService = habitService;
    }

    public StreakFreezeResponse useFreeze(AppUser user, Long habitId, LocalDate date) {
        LocalDate freezeDate = date == null ? LocalDate.now() : date;

        // Validate: can only freeze today or yesterday
        LocalDate today = LocalDate.now();
        if (freezeDate.isBefore(today.minusDays(1)) || freezeDate.isAfter(today)) {
            throw new IllegalArgumentException("Chỉ có thể freeze hôm nay hoặc hôm qua");
        }

        // Check already frozen
        if (freezeRepository.existsByUserIdAndHabitIdAndFreezeDate(user.getId(), habitId, freezeDate)) {
            throw new IllegalArgumentException("Ngày này đã được freeze rồi");
        }

        // Check monthly quota
        int used = usedThisMonth(user);
        if (used >= MAX_FREEZES_PER_MONTH) {
            throw new IllegalArgumentException("Đã hết lượt freeze tháng này (tối đa " + MAX_FREEZES_PER_MONTH + "/tháng)");
        }

        Habit habit = habitService.getHabit(user, habitId);
        StreakFreeze freeze = freezeRepository.save(new StreakFreeze(user, habit, freezeDate));
        return StreakFreezeResponse.from(freeze);
    }

    @Transactional(readOnly = true)
    public int remainingFreezes(AppUser user) {
        return MAX_FREEZES_PER_MONTH - usedThisMonth(user);
    }

    @Transactional(readOnly = true)
    public boolean isFrozen(Long userId, Long habitId, LocalDate date) {
        return freezeRepository.existsByUserIdAndHabitIdAndFreezeDate(userId, habitId, date);
    }

    @Transactional(readOnly = true)
    public List<StreakFreezeResponse> history(AppUser user) {
        YearMonth ym = YearMonth.now();
        return freezeRepository.findByUserIdAndFreezeDateBetweenOrderByFreezeDateDesc(
                        user.getId(), ym.atDay(1), ym.atEndOfMonth())
                .stream().map(StreakFreezeResponse::from).toList();
    }

    private int usedThisMonth(AppUser user) {
        YearMonth ym = YearMonth.now();
        return freezeRepository.countByUserIdAndFreezeDateBetween(
                user.getId(), ym.atDay(1), ym.atEndOfMonth());
    }
}
