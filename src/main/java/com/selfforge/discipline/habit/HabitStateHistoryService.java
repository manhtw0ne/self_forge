package com.selfforge.discipline.habit;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class HabitStateHistoryService {
    private final HabitStateHistoryRepository history;
    private final UserTime time;

    public HabitStateHistoryService(HabitStateHistoryRepository history, UserTime time) {
        this.history = history;
        this.time = time;
    }

    /** Caller holds the owner lock and commits the habit and history in one transaction. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void created(Habit habit) {
        history.save(new HabitStateHistory(habit, HabitStateHistory.Kind.CREATED,
                habit.getTargetPerWeek(), habit.getScheduledDays(), habit.isActive(), time.now(habit.getUser())));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void changed(Habit habit, int previousTarget, String previousSchedule, boolean previouslyActive) {
        if (previousTarget == habit.getTargetPerWeek()
                && java.util.Objects.equals(previousSchedule, habit.getScheduledDays())
                && previouslyActive == habit.isActive()) return;
        var now = time.now(habit.getUser());
        if (!history.existsByHabitId(habit.getId())) {
            history.save(new HabitStateHistory(habit, HabitStateHistory.Kind.OBSERVED,
                    previousTarget, previousSchedule, previouslyActive, now));
        }
        history.save(new HabitStateHistory(habit, HabitStateHistory.Kind.CHANGED,
                habit.getTargetPerWeek(), habit.getScheduledDays(), habit.isActive(), now));
    }

    /**
     * Returns false only when the recorded schedule explicitly says this
     * habit was paused on the selected account-calendar day.  A missing row
     * is intentionally permissive: SelfForge must not invent a pause period
     * for a legacy habit whose state history was introduced after it existed.
     */
    @Transactional(readOnly = true)
    public boolean allowsNewCheckIn(Habit habit, java.time.LocalDate date) {
        HabitStateHistory state = HabitStateTimeline.latestOnOrBefore(
                history.findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(habit.getId(), date), date);
        return state == null || state.isActive();
    }

    public record CheckInSchedule(int targetPerWeek, String scheduledDays) {}

    /** Resolve only a new entry's snapshot; never rewrite an existing check-in. */
    @Transactional(readOnly = true)
    public CheckInSchedule scheduleForNewCheckIn(Habit habit, java.time.LocalDate date) {
        var state = HabitStateTimeline.latestOnOrBefore(
                history.findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(habit.getId(), date), date);
        int target = state == null ? habit.getTargetPerWeek() : state.getTargetPerWeek();
        String days = state == null ? habit.getScheduledDays() : state.getScheduledDays();
        // Dates before observations began deliberately retain the current fallback.
        return new CheckInSchedule(target, HabitSchedule.normalizeOrDefault(days, target));
    }

    public record Entry(Long id, HabitStateHistory.Kind kind, int targetPerWeek, String scheduledDays, boolean active,
                        java.time.Instant recordedAt, java.time.LocalDate calendarDate, String timezone) {
        static Entry from(HabitStateHistory row) {
            return new Entry(row.getId(), row.getKind(), row.getTargetPerWeek(), row.getScheduledDays(), row.isActive(),
                    row.getRecordedAt(), row.getCalendarDate(), row.getTimezone());
        }
    }
    public record Page(List<Entry> items, Long nextCursor) {}

    @Transactional(readOnly = true)
    public Page history(AppUser user, Long habitId, Long beforeId) {
        if (beforeId != null && beforeId <= 0) throw new IllegalArgumentException("Invalid habit history cursor");
        var rows = history.history(user.getId(), habitId, beforeId, PageRequest.of(0, 21));
        var items = rows.stream().limit(20).map(Entry::from).toList();
        return new Page(items, rows.size() > 20 ? items.getLast().id() : null);
    }
}
