package com.selfforge.discipline.streak;

import com.selfforge.discipline.checkin.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StreakService {
    private final DailyCheckInRepository checkIns;
    private final StreakFreezeRepository freezes;

    public StreakService(DailyCheckInRepository checkIns, StreakFreezeRepository freezes) {
        this.checkIns = checkIns;
        this.freezes = freezes;
    }

    public int current(Long userId, Long habitId, LocalDate today) {
        return count(userId, habitId, today, true, 7);
    }

    /** Streak-aware of targetPerWeek: SKIPPED on a non-required day does not break the streak. */
    public int current(Long userId, Long habitId, LocalDate today, int targetPerWeek) {
        return count(userId, habitId, today, true, targetPerWeek);
    }

    public int endingOn(Long userId, Long habitId, LocalDate date) {
        return count(userId, habitId, date, false, 7);
    }

    public int endingOn(Long userId, Long habitId, LocalDate date, int targetPerWeek) {
        return count(userId, habitId, date, false, targetPerWeek);
    }

    private int count(Long userId, Long habitId, LocalDate end, boolean openDayGrace, int targetPerWeek) {
        int completed = 0;
        boolean firstDay = true;
        while (true) {
            LocalDate start = end.toEpochDay() - LocalDate.MIN.toEpochDay() < 127
                    ? LocalDate.MIN : end.minusDays(127);
            Map<LocalDate, CheckInStatus> statuses = new HashMap<>();
            checkIns.findByHabit_User_IdAndHabitIdAndDateBetween(userId, habitId, start, end)
                    .forEach(checkIn -> statuses.put(checkIn.getDate(), checkIn.getStatus()));
            Set<LocalDate> frozen = freezes.findByUserIdAndHabitIdAndFreezeDateBetween(userId, habitId, start, end)
                    .stream().map(StreakFreeze::getFreezeDate).collect(Collectors.toSet());
            LocalDate cursor = end;
            while (true) {
                CheckInStatus status = statuses.get(cursor);
                if (status == CheckInStatus.COMPLETED) {
                    completed++;
                } else if (frozen.contains(cursor)) {
                    // Frozen day: streak preserved, no completed count added
                } else if (firstDay && openDayGrace && status == null) {
                    // Today not yet checked in: grace period
                } else if (status == CheckInStatus.SKIPPED && targetPerWeek < 7
                        && !isRequiredDay(cursor, targetPerWeek)) {
                    // SKIPPED on a non-required day does not break the streak
                } else {
                    return completed;
                }
                firstDay = false;
                if (cursor.equals(start)) break;
                cursor = cursor.minusDays(1);
            }
            if (start.equals(LocalDate.MIN)) return completed;
            end = start.minusDays(1);
        }
    }

    /**
     * Returns true if the given date is a "required" day for a habit with targetPerWeek days.
     *
     * Strategy: mark the first targetPerWeek days of the week (Mon-based) as required.
     * This is the simplest, most intuitive distribution:
     *  targetPerWeek=1 → Mon only
     *  targetPerWeek=3 → Mon, Tue, Wed
     *  targetPerWeek=5 → Mon, Tue, Wed, Thu, Fri
     *  targetPerWeek=7 → all days
     *
     * A SKIPPED on any day beyond targetPerWeek does not break the streak.
     */
    public static boolean isRequiredDay(LocalDate date, int targetPerWeek) {
        if (targetPerWeek >= 7) return true;
        if (targetPerWeek <= 0) return false;
        // Day-of-week: Mon=0 … Sun=6
        int dow = date.getDayOfWeek().getValue() - 1;
        return dow < targetPerWeek;
    }
}