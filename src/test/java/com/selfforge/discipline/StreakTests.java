package com.selfforge.discipline;

import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitStateHistoryRepository;
import com.selfforge.discipline.habit.HabitStateHistory;
import com.selfforge.discipline.streak.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class StreakTests {
    private final LocalDate today = LocalDate.of(2026, 9, 24);
    private final DailyCheckInRepository checks = mock(DailyCheckInRepository.class);
    private final StreakFreezeRepository freezes = mock(StreakFreezeRepository.class);
    private final HabitStateHistoryRepository stateHistory = mock(HabitStateHistoryRepository.class);
    private final StreakService service = new StreakService(checks, freezes, stateHistory);
    private final Map<LocalDate, CheckInStatus> history = new HashMap<>();
    private final Set<LocalDate> protectedDays = new HashSet<>();

    StreakTests() {
        when(checks.findByHabit_User_IdAndHabitIdAndDateBetween(eq(1L), eq(2L), any(), any()))
                .thenAnswer(call -> history.entrySet().stream()
                        .filter(e -> !e.getKey().isBefore(call.getArgument(2, LocalDate.class))
                                && !e.getKey().isAfter(call.getArgument(3, LocalDate.class)))
                        .map(e -> new DailyCheckIn(mock(Habit.class), e.getKey(), e.getValue(), null)).toList());
        when(freezes.findByUserIdAndHabitIdAndFreezeDateBetween(eq(1L), eq(2L), any(), any()))
                .thenAnswer(call -> protectedDays.stream()
                        .filter(d -> !d.isBefore(call.getArgument(2, LocalDate.class))
                                && !d.isAfter(call.getArgument(3, LocalDate.class)))
                        .map(d -> { var freeze = mock(StreakFreeze.class);
                            when(freeze.getFreezeDate()).thenReturn(d); return freeze; }).toList());
        when(stateHistory.findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(eq(2L), any()))
                .thenReturn(List.of());
    }

    @Test void countsBeyondOneWindowAndBatchesQueries() {
        for (int i = 0; i < 300; i++) history.put(today.minusDays(i), CheckInStatus.COMPLETED);
        assertEquals(300, service.current(1L, 2L, today));
        verify(checks, times(3)).findByHabit_User_IdAndHabitIdAndDateBetween(eq(1L), eq(2L), any(), any());
        verify(freezes, times(3)).findByUserIdAndHabitIdAndFreezeDateBetween(eq(1L), eq(2L), any(), any());
        verify(stateHistory, times(1))
                .findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(eq(2L), eq(today));
    }

    @Test void freezeBridgesWindowBoundaryWithoutAddingCompletedDays() {
        for (int i = 0; i < 150; i++) history.put(today.minusDays(i), CheckInStatus.COMPLETED);
        history.remove(today.minusDays(127));
        protectedDays.add(today.minusDays(127));
        protectedDays.add(today); // A completed and frozen day counts once.
        assertEquals(149, service.current(1L, 2L, today));
    }

    @Test void onlyUnrecordedCurrentDayGetsGrace() {
        history.put(today.minusDays(1), CheckInStatus.COMPLETED);
        assertEquals(1, service.current(1L, 2L, today));
        for (var status : List.of(CheckInStatus.FAILED, CheckInStatus.SKIPPED)) {
            history.put(today, status);
            assertEquals(0, service.current(1L, 2L, today));
        }
        protectedDays.add(today);
        assertEquals(1, service.current(1L, 2L, today));
    }

    @Test void penaltyDoesNotSkipMissingYesterday() {
        history.put(today.minusDays(2), CheckInStatus.COMPLETED);
        assertEquals(1, service.current(1L, 2L, today.minusDays(1)));
        assertEquals(0, service.endingOn(1L, 2L, today.minusDays(1)));
        assertEquals(0, service.current(1L, 2L, today));
    }

    @Test void handlesEmptyHistoryAndMinimumDate() {
        assertEquals(0, service.current(1L, 2L, today));
        assertEquals(0, service.current(1L, 2L, LocalDate.MIN));
    }

    // ---- targetPerWeek tests ----

    @Test void increasingToDailyKeepsUnrecordedHistoricalWeekendAsRest() {
        historicalWeekBeforeDailyChange(false);
        assertEquals(5, service.endingOn(1L, 2L, today, 7));
        assertEquals(5, service.current(1L, 2L, today, 7));
    }

    @Test void increasingToDailyKeepsLegacySkippedHistoricalWeekendAsRest() {
        historicalWeekBeforeDailyChange(true);
        assertEquals(5, service.endingOn(1L, 2L, today, 7));
    }

    @Test void historicalRequiredDayStillBreaksEvenWhenCurrentScheduleHasARestDay() {
        historicalWeekBeforeDailyChange(false);
        var daily = mock(HabitStateHistory.class);
        when(daily.getCalendarDate()).thenReturn(today.minusDays(10));
        when(daily.getScheduledDays()).thenReturn("MON,TUE,WED,THU,FRI,SAT,SUN");
        when(daily.isActive()).thenReturn(true);
        when(stateHistory.findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(eq(2L), any()))
                .thenReturn(List.of(daily));
        assertEquals(4, service.endingOn(1L, 2L, today, 5));
    }

    private void historicalWeekBeforeDailyChange(boolean skippedWeekend) {
        // Thu 24 switches to daily; the earlier weekend was recorded as rest.
        var daily = mock(HabitStateHistory.class);
        when(daily.getCalendarDate()).thenReturn(today);
        when(daily.getScheduledDays()).thenReturn("MON,TUE,WED,THU,FRI,SAT,SUN");
        when(daily.isActive()).thenReturn(true);
        var weekdays = mock(HabitStateHistory.class);
        when(weekdays.getCalendarDate()).thenReturn(today.minusDays(10));
        when(weekdays.getScheduledDays()).thenReturn("MON,TUE,WED,THU,FRI");
        when(weekdays.isActive()).thenReturn(true);
        when(stateHistory.findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(eq(2L), any()))
                .thenReturn(List.of(daily, weekdays));
        for (int i = 0; i < 4; i++) history.put(today.minusDays(i), CheckInStatus.COMPLETED);
        history.put(today.minusDays(6), CheckInStatus.COMPLETED); // previous Friday
        if (skippedWeekend) {
            history.put(today.minusDays(4), CheckInStatus.SKIPPED);
            history.put(today.minusDays(5), CheckInStatus.SKIPPED);
        }
    }

    @Test void recordedPauseWindowBridgesStreakWithoutAddingCompletedDays() {
        var resumed = mock(HabitStateHistory.class);
        when(resumed.getCalendarDate()).thenReturn(today);
        when(resumed.getScheduledDays()).thenReturn("MON,TUE,WED,THU,FRI,SAT,SUN");
        when(resumed.isActive()).thenReturn(true);
        var paused = mock(HabitStateHistory.class);
        when(paused.getCalendarDate()).thenReturn(today.minusDays(2));
        when(paused.getScheduledDays()).thenReturn("MON,TUE,WED,THU,FRI,SAT,SUN");
        when(paused.isActive()).thenReturn(false);
        when(stateHistory.findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(eq(2L), any()))
                .thenReturn(List.of(resumed, paused));
        history.put(today, CheckInStatus.COMPLETED);
        history.put(today.minusDays(3), CheckInStatus.COMPLETED);

        assertEquals(2, service.endingOn(1L, 2L, today, 7));
    }

    @ParameterizedTest
    @EnumSource(CheckInStatus.class)
    void savedCheckInStillCountsOrBreaksOnARecordedPauseDay(CheckInStatus status) {
        var resumed = mock(HabitStateHistory.class);
        when(resumed.getCalendarDate()).thenReturn(today);
        when(resumed.getScheduledDays()).thenReturn("MON,TUE,WED,THU,FRI,SAT,SUN");
        when(resumed.isActive()).thenReturn(true);
        var paused = mock(HabitStateHistory.class);
        when(paused.getCalendarDate()).thenReturn(today.minusDays(1));
        when(paused.getScheduledDays()).thenReturn("MON,TUE,WED,THU,FRI,SAT,SUN");
        when(paused.isActive()).thenReturn(false);
        when(stateHistory.findByHabit_IdAndCalendarDateLessThanEqualOrderByCalendarDateDescIdDesc(eq(2L), any()))
                .thenReturn(List.of(resumed, paused));
        history.put(today, CheckInStatus.COMPLETED);
        history.put(today.minusDays(1), status);
        history.put(today.minusDays(2), CheckInStatus.COMPLETED);

        assertEquals(status == CheckInStatus.COMPLETED ? 3 : 1,
                service.endingOn(1L, 2L, today, 7));
        // A freeze still protects a failed/skipped saved day; a completion counts once.
        protectedDays.add(today.minusDays(1));
        assertEquals(status == CheckInStatus.COMPLETED ? 3 : 2,
                service.endingOn(1L, 2L, today, 7));
    }

    @Test void skippedOnNonRequiredDayDoesNotBreakStreakForPartialWeekHabit() {
        // today = 2026-09-24 (Thu). With targetPerWeek=5, required days are Mon/Tue/Wed/Thu/Fri.
        // Sunday (2026-09-20) is NOT required for targetPerWeek=5.
        // Build a streak: last Sunday SKIPPED, Mon-Thu COMPLETED, last Saturday COMPLETED
        LocalDate lastSun = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));  // 2026-09-20
        LocalDate lastSat = lastSun.minusDays(1); // 2026-09-19 (Sat)

        // 4 days Mon-Thu this week completed
        history.put(today, CheckInStatus.COMPLETED);               // Thu
        history.put(today.minusDays(1), CheckInStatus.COMPLETED);  // Wed
        history.put(today.minusDays(2), CheckInStatus.COMPLETED);  // Tue
        history.put(today.minusDays(3), CheckInStatus.COMPLETED);  // Mon
        // Sunday SKIPPED — non-required for targetPerWeek=5
        history.put(lastSun, CheckInStatus.SKIPPED);
        // Saturday COMPLETED
        history.put(lastSat, CheckInStatus.COMPLETED);

        // With targetPerWeek=7 (daily): SKIPPED Sunday breaks streak → streak=4
        assertEquals(4, service.endingOn(1L, 2L, today, 7));
        // With targetPerWeek=5: SKIPPED Sunday does not break streak → streak=5 (4 required days + 1 Sat completed)
        int streak5 = service.endingOn(1L, 2L, today, 5);
        assertEquals(5, streak5);
    }

    @Test void missingRestDayDoesNotNeedAManualSkippedCheckIn() {
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        history.put(monday, CheckInStatus.COMPLETED);
        history.put(monday.plusDays(1), CheckInStatus.COMPLETED);
        history.put(monday.plusDays(2), CheckInStatus.COMPLETED);
        history.put(monday.plusDays(3), CheckInStatus.COMPLETED);
        // Sunday is intentionally absent. It is a rest day for the legacy 5/week schedule,
        // so the completed Saturday before it remains part of the streak.
        history.put(monday.minusDays(2), CheckInStatus.COMPLETED);
        assertEquals(5, service.endingOn(1L, 2L, monday.plusDays(3), 5));
    }

    @Test void skippedOnRequiredDayStillBreaksStreak() {
        // targetPerWeek=5: Monday IS required. SKIPPED Monday breaks streak.
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        // Tue/Wed/Thu completed, Mon SKIPPED (required day)
        history.put(monday.plusDays(1), CheckInStatus.COMPLETED);
        history.put(monday.plusDays(2), CheckInStatus.COMPLETED);
        history.put(monday.plusDays(3), CheckInStatus.COMPLETED);
        history.put(monday, CheckInStatus.SKIPPED);
        // Streak ending on Monday should be 0 since Monday is SKIPPED (required)
        assertEquals(0, service.endingOn(1L, 2L, monday, 5));
    }

    @Test void isRequiredDayDistributesEvenly() {
        LocalDate mon = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        // targetPerWeek=7: all days required
        for (int v = 0; v < 7; v++) {
            assertTrue(StreakService.isRequiredDay(mon.plusDays(v), 7), "All days required for 7");
        }
        // targetPerWeek=5: Mon-Fri required, Sat/Sun not
        for (int v = 0; v < 5; v++) assertTrue(StreakService.isRequiredDay(mon.plusDays(v), 5));
        assertFalse(StreakService.isRequiredDay(mon.plusDays(5), 5)); // Sat
        assertFalse(StreakService.isRequiredDay(mon.plusDays(6), 5)); // Sun
        // targetPerWeek=1: only Monday required
        assertTrue(StreakService.isRequiredDay(mon, 1));
        assertFalse(StreakService.isRequiredDay(mon.plusDays(1), 1)); // Tue
        // targetPerWeek=0: nothing required
        assertFalse(StreakService.isRequiredDay(mon, 0));
    }

    @Test void streakBeyond127DaysStillCountsCorrectly() {
        // 200 completed days — must batch into 2 windows and return 200
        for (int i = 0; i < 200; i++) history.put(today.minusDays(i), CheckInStatus.COMPLETED);
        assertEquals(200, service.current(1L, 2L, today, 7));
        assertEquals(200, service.current(1L, 2L, today, 5));
    }
}
