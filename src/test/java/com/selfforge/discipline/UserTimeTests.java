package com.selfforge.discipline;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitService;
import com.selfforge.discipline.habit.HabitStateHistoryRepository;
import com.selfforge.discipline.reminder.*;
import com.selfforge.discipline.mood.*;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserTimeTests {
    private AppUser user(String timezone) {
        AppUser user = mock(AppUser.class);
        when(user.getId()).thenReturn(1L);
        when(user.getTimezone()).thenReturn(timezone);
        return user;
    }

    private UserTime time(String instant) {
        // Deliberately different clock zone: only the profile controls the calendar.
        return new UserTime(Clock.fixed(Instant.parse(instant), ZoneId.of("Pacific/Honolulu")));
    }

    @Test void midnightChangesTheUserDateAndCrossesYearBoundary() {
        var user = user("Asia/Ho_Chi_Minh");
        assertEquals(LocalDate.of(2025, 12, 31), time("2025-12-31T16:59:59Z").today(user));
        assertEquals(LocalDate.of(2026, 1, 1), time("2025-12-31T17:00:00Z").today(user));
        assertEquals(LocalDate.of(2025, 12, 31), time("2025-12-31T17:00:00Z").today(user("America/New_York")));
    }

    @Test void legacyMissingOrInvalidZonesHaveStableFallback() {
        var time = time("2026-01-31T18:00:00Z");
        for (String zone : new String[]{null, "", "invalid"}) {
            assertEquals(LocalDate.of(2026, 2, 1), time.today(user(zone)));
        }
    }

    @Test void dayWindowsRespectBothDstTransitionsAndLeapDay() {
        var time = time("2026-01-01T00:00:00Z");
        var user = user("America/New_York");
        var spring = time.day(user, LocalDate.of(2026, 3, 8));
        var autumn = time.day(user, LocalDate.of(2026, 11, 1));
        assertEquals(23, Duration.between(spring.start(), spring.end()).toHours());
        assertEquals(25, Duration.between(autumn.start(), autumn.end()).toHours());
        assertEquals(spring.end(), time.day(user, LocalDate.of(2026, 3, 9)).start());
        assertEquals(time.day(user, LocalDate.of(2024, 3, 1)).start(),
                time.day(user, LocalDate.of(2024, 2, 29)).end());
    }

    @Test void moodTodayUsesProfileDate() {
        var repository = mock(MoodRepository.class);
        var user = user("Asia/Ho_Chi_Minh");
        new MoodService(repository, time("2025-12-31T18:00:00Z"), org.mockito.Mockito.mock(com.selfforge.discipline.auth.AppUserRepository.class)).getToday(user);
        verify(repository).findByUserIdAndDate(1L, LocalDate.of(2026, 1, 1));
    }

    @Test void remindersCrossMidnightUsingThePreviousWeekday() {
        var user = user("Asia/Ho_Chi_Minh");
        var repository = mock(ReminderRepository.class);
        var habit = mock(Habit.class);
        when(habit.isActive()).thenReturn(true);
        when(habit.getId()).thenReturn(1L);
        when(habit.getScheduledDays()).thenReturn("SUN");
        var restDayHabit = mock(Habit.class);
        when(restDayHabit.isActive()).thenReturn(true);
        when(restDayHabit.getId()).thenReturn(2L);
        when(restDayHabit.getScheduledDays()).thenReturn("MON");
        var due = new Reminder(user, habit, LocalTime.of(23, 50), "SUN", "due");
        var wrongDay = new Reminder(user, habit, LocalTime.of(23, 50), "MON", "wrong day");
        var tooOld = new Reminder(user, habit, LocalTime.of(23, 39), "SUN", "old");
        var scheduledRest = new Reminder(user, restDayHabit, LocalTime.of(23, 50), "SUN", "rest day");
        when(repository.findByUserIdAndEnabledTrueOrderByReminderTimeAsc(1L))
                .thenReturn(List.of(due, wrongDay, tooOld, scheduledRest));
        var service = new ReminderService(repository, mock(HabitService.class), time("2026-09-20T17:10:00Z"), mock(com.selfforge.discipline.auth.AppUserRepository.class), mock(ReminderCreateReceiptRepository.class), new com.fasterxml.jackson.databind.ObjectMapper(), mock(HabitStateHistoryRepository.class));
        assertEquals(1, service.getDueReminders(user).size());
        assertEquals("due", service.getDueReminders(user).getFirst().message());
        when(habit.isActive()).thenReturn(false);
        assertTrue(service.getDueReminders(user).isEmpty());
    }
}
