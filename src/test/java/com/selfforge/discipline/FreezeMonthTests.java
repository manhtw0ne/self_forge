package com.selfforge.discipline;

import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.*;
import com.selfforge.discipline.streak.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class FreezeMonthTests {
    @Test void freezingYesterdayAtMonthBoundaryConsumesCurrentMonthQuota() {
        AppUser user = mock(AppUser.class);
        when(user.getId()).thenReturn(1L);
        when(user.getTimezone()).thenReturn("Asia/Ho_Chi_Minh");
        var now = Instant.parse("2026-09-30T17:05:00Z");
        var time = new UserTime(Clock.fixed(now, ZoneOffset.UTC));
        var repo = mock(StreakFreezeRepository.class);
        var users = mock(AppUserRepository.class);
        var habits = mock(HabitService.class);
        when(users.lockById(1L)).thenReturn(Optional.of(user));
        when(habits.getHabit(user, 2L)).thenReturn(mock(Habit.class));
        when(repo.countByUserIdAndUsedAtGreaterThanEqualAndUsedAtLessThan(1L,
                Instant.parse("2026-09-30T17:00:00Z"), Instant.parse("2026-10-31T17:00:00Z"))).thenReturn(1);
        var service = new StreakFreezeService(repo, habits, time, users);
        assertThrows(IllegalStateException.class, () -> service.useFreeze(user, 2L, LocalDate.of(2026, 9, 30)));
        verify(repo, never()).save(any());
        assertEquals(0, service.remainingFreezes(user));
    }
}