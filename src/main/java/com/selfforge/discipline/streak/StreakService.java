package com.selfforge.discipline.streak;

import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.habit.HabitSchedule;
import com.selfforge.discipline.habit.HabitStateHistory;
import com.selfforge.discipline.habit.HabitStateHistoryRepository;
import com.selfforge.discipline.habit.HabitStateTimeline;
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
    private final HabitStateHistoryRepository stateHistory;

    public StreakService(DailyCheckInRepository checkIns, StreakFreezeRepository freezes, HabitStateHistoryRepository stateHistory) {
        this.checkIns = checkIns;
        this.freezes = freezes;
        this.stateHistory = stateHistory;
    }

    public int current(Long userId, Long habitId, LocalDate today) {
        return count(userId, habitId, today, true, 7);
    }

    /** Streak-aware of targetPerWeek: scheduled rest days do not break the streak. */
    public int current(Long userId, Long habitId, LocalDate today, int targetPerWeek) {
        return count(userId, habitId, today, true, targetPerWeek, HabitSchedule.defaultFor(targetPerWeek));
    }

    public int current(Long userId, Long habitId, LocalDate today, int targetPerWeek, String scheduledDays) {
        return count(userId, habitId, today, true, targetPerWeek, HabitSchedule.normalizeOrDefault(scheduledDays, targetPerWeek));
    }

    public int endingOn(Long userId, Long habitId, LocalDate date) {
        return count(userId, habitId, date, false, 7);
    }

    public int endingOn(Long userId, Long habitId, LocalDate date, int targetPerWeek) {
        return count(userId, habitId, date, false, targetPerWeek, HabitSchedule.defaultFor(targetPerWeek));
    }

    public int endingOn(Long userId, Long habitId, LocalDate date, int targetPerWeek, String scheduledDays) {
        return count(userId, habitId, date, false, targetPerWeek, HabitSchedule.normalizeOrDefault(scheduledDays, targetPerWeek));
    }

    private int count(Long userId, Long habitId, LocalDate end, boolean openDayGrace, int targetPerWeek) {
        return count(userId, habitId, end, openDayGrace, targetPerWeek, HabitSchedule.defaultFor(targetPerWeek));
    }

    private int count(Long userId, Long habitId, LocalDate end, boolean openDayGrace, int targetPerWeek, String scheduledDays) {
        int completed = 0;
        boolean firstDay = true;
        // Load schedule history once. A long streak is read in 127-day check-in windows,
        // but the same schedule history applies across all of those windows.
        NavigableMap<LocalDate, HabitStateHistory> states = HabitStateTimeline.timelineOnOrBefore(
                stateHistory.findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(habitId, end), end);
        while (true) {
            LocalDate start = end.toEpochDay() - LocalDate.MIN.toEpochDay() < 127
                    ? LocalDate.MIN : end.minusDays(127);
            Map<LocalDate, DailyCheckIn> records = new HashMap<>();
            checkIns.findByHabit_User_IdAndHabitIdAndDateBetween(userId, habitId, start, end)
                    .forEach(checkIn -> records.put(checkIn.getDate(), checkIn));
            Set<LocalDate> frozen = freezes.findByUserIdAndHabitIdAndFreezeDateBetween(userId, habitId, start, end)
                    .stream().map(StreakFreeze::getFreezeDate).collect(Collectors.toSet());
            LocalDate cursor = end;
            while (true) {
                DailyCheckIn record = records.get(cursor);
                CheckInStatus status = record == null ? null : record.getStatus();
                int recordedTarget = record != null && record.getTargetPerWeekSnapshot() != null
                        ? record.getTargetPerWeekSnapshot() : targetPerWeek;
                HabitStateHistory stateForDay = states.floorEntry(cursor) == null
                        ? null : states.floorEntry(cursor).getValue();
                String recordedSchedule = record != null && record.getScheduledDaysSnapshot() != null
                        ? record.getScheduledDaysSnapshot()
                        : (record != null && record.getTargetPerWeekSnapshot() != null
                        ? HabitSchedule.defaultFor(recordedTarget)
                        : stateForDay == null ? scheduledDays : stateForDay.getScheduledDays());
                if (record == null && stateForDay != null && !stateForDay.isActive()) {
                    // A recorded pause bridges only unrecorded days. Saved work,
                    // failures and corrections keep their meaning even when a
                    // later pause is recorded on the same calendar date.
                    // Missing legacy history is never inferred to be a pause.
                } else if (status == CheckInStatus.COMPLETED) {
                    completed++;
                } else if (frozen.contains(cursor)) {
                    // Frozen day: streak preserved, no completed count added
                } else if (firstDay && openDayGrace && status == null) {
                    // Today not yet checked in: grace period
                } else if ((status == null || status == CheckInStatus.SKIPPED)
                        && !isRequiredDay(cursor, recordedSchedule)) {
                    // The resolved historical schedule decides rest days. Today's target
                    // may have changed to daily and must not override that older schedule.
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
     * The legacy overload uses the first targetPerWeek days of the week (Mon-based):
     *  targetPerWeek=1 → Mon only
     *  targetPerWeek=3 → Mon, Tue, Wed
     *  targetPerWeek=5 → Mon, Tue, Wed, Thu, Fri
     *  targetPerWeek=7 → all days
     *
     * A scheduled rest day does not break the streak, even without a check-in.
     */
    public static boolean isRequiredDay(LocalDate date, int targetPerWeek) {
        if (targetPerWeek <= 0) return false;
        return isRequiredDay(date, HabitSchedule.defaultFor(targetPerWeek));
    }

    public static boolean isRequiredDay(LocalDate date, String scheduledDays) {
        return HabitSchedule.includes(scheduledDays, date);
    }
}
