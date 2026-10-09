package com.selfforge.discipline;

import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.streak.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class StreakTests {
    private final LocalDate today = LocalDate.of(2026, 9, 24);
    private final DailyCheckInRepository checks = mock(DailyCheckInRepository.class);
    private final StreakFreezeRepository freezes = mock(StreakFreezeRepository.class);
    private final StreakService service = new StreakService(checks, freezes);
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
    }

    @Test void countsBeyondOneWindowAndBatchesQueries() {
        for (int i = 0; i < 300; i++) history.put(today.minusDays(i), CheckInStatus.COMPLETED);
        assertEquals(300, service.current(1L, 2L, today));
        verify(checks, times(3)).findByHabit_User_IdAndHabitIdAndDateBetween(eq(1L), eq(2L), any(), any());
        verify(freezes, times(3)).findByUserIdAndHabitIdAndFreezeDateBetween(eq(1L), eq(2L), any(), any());
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
}