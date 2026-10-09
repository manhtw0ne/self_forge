package com.selfforge.discipline;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.habit.HabitService;
import com.selfforge.discipline.pomodoro.*;
import com.selfforge.discipline.reward.RewardService;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PomodoroTimingTests {
    private final Instant start = Instant.parse("2026-09-23T00:00:00Z");
    private final AppUser user = mock(AppUser.class);
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final PomodoroRepository sessions = mock(PomodoroRepository.class);
    private final RewardService rewards = mock(RewardService.class);

    private PomodoroService service(Instant now) {
        when(user.getId()).thenReturn(1L);
        when(users.lockById(1L)).thenReturn(Optional.of(user));
        return new PomodoroService(sessions, mock(HabitService.class), rewards, users,
                Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test void rejectsOneMillisecondBeforeDeadlineWithoutAwardingXp() {
        var session = new PomodoroSession(user, null, 25, start);
        when(sessions.findById(1L)).thenReturn(Optional.of(session));
        assertThrows(IllegalStateException.class,
                () -> service(start.plusSeconds(1500).minusMillis(1)).completeSession(user, 1L, "Early"));
        assertFalse(session.isCompleted());
        assertNull(session.getEndedAt());
        verifyNoInteractions(rewards);
    }

    @Test void acceptsExactDeadlineAndRepeatedCallDoesNotAwardAgain() {
        var session = new PomodoroSession(user, null, 25, start);
        when(sessions.findById(1L)).thenReturn(Optional.of(session));
        var service = service(start.plusSeconds(1500));
        service.completeSession(user, 1L, "Done");
        service.completeSession(user, 1L, "Do not overwrite");
        assertTrue(session.isCompleted());
        assertEquals(start.plusSeconds(1500), session.getEndedAt());
        assertEquals("Done", session.getNote());
        verify(rewards, times(1)).addXp(user, 5);
    }

    @Test void overlappingCompletedTimeCannotEarnAnotherReward() {
        var session = new PomodoroSession(user, null, 25, start);
        when(sessions.findById(1L)).thenReturn(Optional.of(session));
        when(sessions.existsByUserIdAndCompletedTrueAndEndedAtAfter(1L, start)).thenReturn(true);
        assertThrows(IllegalStateException.class,
                () -> service(start.plusSeconds(2000)).completeSession(user, 1L, null));
        assertFalse(session.isCompleted());
        verifyNoInteractions(rewards);
    }

    @Test void legacyInvalidDurationCannotEarnXp() {
        var session = new PomodoroSession(user, null, -1, start);
        when(sessions.findById(1L)).thenReturn(Optional.of(session));
        assertThrows(IllegalArgumentException.class,
                () -> service(start.plusSeconds(2000)).completeSession(user, 1L, null));
        verifyNoInteractions(rewards);
    }
}
