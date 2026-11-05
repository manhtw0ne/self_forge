package com.selfforge.discipline.habit;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Canonical weekly schedule used by habits and immutable check-in snapshots.
 * Stored as a compact, Monday-first comma-separated list (for example MON,WED,FRI).
 */
public final class HabitSchedule {
    private static final List<DayOfWeek> WEEK = List.of(
            DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY
    );

    private HabitSchedule() {
    }

    public static String defaultFor(int targetPerWeek) {
        requireTarget(targetPerWeek);
        return WEEK.subList(0, targetPerWeek).stream().map(HabitSchedule::code).reduce((left, right) -> left + "," + right).orElseThrow();
    }

    public static String normalize(String scheduledDays) {
        if (scheduledDays == null || scheduledDays.isBlank()) {
            return null;
        }
        Set<DayOfWeek> selected = EnumSet.noneOf(DayOfWeek.class);
        for (String value : scheduledDays.split(",", -1)) {
            String code = value.trim().toUpperCase(Locale.ROOT);
            try {
                DayOfWeek day = DayOfWeek.valueOf(codeName(code));
                if (!selected.add(day)) {
                    throw new IllegalArgumentException("Ngày thực hiện không được trùng.");
                }
            } catch (IllegalArgumentException exception) {
                if ("Ngày thực hiện không được trùng.".equals(exception.getMessage())) {
                    throw exception;
                }
                throw new IllegalArgumentException("Lịch thực hiện chỉ gồm MON, TUE, WED, THU, FRI, SAT hoặc SUN.");
            }
        }
        if (selected.isEmpty()) {
            return null;
        }
        return WEEK.stream().filter(selected::contains).map(HabitSchedule::code).reduce((left, right) -> left + "," + right).orElseThrow();
    }

    public static String normalizeOrDefault(String scheduledDays, int targetPerWeek) {
        String normalized = normalize(scheduledDays);
        return normalized == null ? defaultFor(targetPerWeek) : normalized;
    }

    public static void requireMatchesTarget(String scheduledDays, int targetPerWeek) {
        requireTarget(targetPerWeek);
        String normalized = normalize(scheduledDays);
        int count = normalized == null ? 0 : normalized.split(",").length;
        if (count != targetPerWeek) {
            throw new IllegalArgumentException("Số ngày trong lịch phải bằng mục tiêu mỗi tuần.");
        }
    }

    public static boolean includes(String scheduledDays, LocalDate date) {
        String normalized = normalize(scheduledDays);
        return normalized != null && ("," + normalized + ",").contains("," + code(date.getDayOfWeek()) + ",");
    }

    private static void requireTarget(int targetPerWeek) {
        if (targetPerWeek < 1 || targetPerWeek > 7) {
            throw new IllegalArgumentException("Mục tiêu mỗi tuần phải từ 1 đến 7.");
        }
    }

    private static String code(DayOfWeek day) {
        return day.name().substring(0, 3);
    }

    private static String codeName(String code) {
        return switch (code) {
            case "MON" -> "MONDAY";
            case "TUE" -> "TUESDAY";
            case "WED" -> "WEDNESDAY";
            case "THU" -> "THURSDAY";
            case "FRI" -> "FRIDAY";
            case "SAT" -> "SATURDAY";
            case "SUN" -> "SUNDAY";
            default -> throw new IllegalArgumentException("Unknown day");
        };
    }
}
