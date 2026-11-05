package com.selfforge.discipline.habit;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;

/**
 * Resolves date-effective habit state without allowing a later timezone change
 * to make a newer state disappear behind an older calendar-date label.
 */
public final class HabitStateTimeline {
    private HabitStateTimeline() { }

    public static HabitStateHistory latestOnOrBefore(List<HabitStateHistory> rows, LocalDate date) {
        var timeline = timelineOnOrBefore(rows, date);
        var entry = timeline.floorEntry(date);
        return entry == null ? null : entry.getValue();
    }

    public static NavigableMap<LocalDate, HabitStateHistory> timelineOnOrBefore(
            List<HabitStateHistory> rows, LocalDate date) {
        var chronological = new ArrayList<HabitStateHistory>();
        for (HabitStateHistory row : rows) {
            if (!row.getCalendarDate().isAfter(date)) chronological.add(row);
        }
        chronological.sort(HabitStateTimeline::compareChronologically);

        var effective = new TreeMap<LocalDate, HabitStateHistory>();
        for (HabitStateHistory row : chronological) {
            // A state written later is the current truth from its recorded
            // calendar date forward. This matters when moving west makes a
            // later action carry an earlier calendarDate than a prior action.
            effective.tailMap(row.getCalendarDate(), true).clear();
            effective.put(row.getCalendarDate(), row);
        }
        return effective;
    }

    private static int compareChronologically(HabitStateHistory left, HabitStateHistory right) {
        // Persisted rows always have recordedAt. The date/ID fallback preserves the
        // former deterministic behaviour for legacy projections and lightweight
        // unit-test fixtures that predate that column.
        if (left.getRecordedAt() != null && right.getRecordedAt() != null) {
            int byRecordedAt = left.getRecordedAt().compareTo(right.getRecordedAt());
            if (byRecordedAt != 0) return byRecordedAt;
        } else {
            int byCalendarDate = left.getCalendarDate().compareTo(right.getCalendarDate());
            if (byCalendarDate != 0) return byCalendarDate;
        }
        return compareNullableIds(left.getId(), right.getId());
    }

    private static int compareNullableIds(Long left, Long right) {
        if (left == right) return 0;
        if (left == null) return -1;
        if (right == null) return 1;
        return left.compareTo(right);
    }

    public static Map<Long, HabitStateHistory> latestForHabits(
            List<HabitStateHistory> rows, LocalDate date) {
        var grouped = new HashMap<Long, List<HabitStateHistory>>();
        for (HabitStateHistory row : rows) {
            grouped.computeIfAbsent(row.getHabitId(), ignored -> new ArrayList<>()).add(row);
        }
        var resolved = new HashMap<Long, HabitStateHistory>();
        for (var entry : grouped.entrySet()) {
            HabitStateHistory state = latestOnOrBefore(entry.getValue(), date);
            if (state != null) resolved.put(entry.getKey(), state);
        }
        return resolved;
    }
}
