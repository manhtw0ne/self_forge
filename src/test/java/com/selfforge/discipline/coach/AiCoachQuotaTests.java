package com.selfforge.discipline.coach;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class AiCoachQuotaTests {
    private static final LocalDate MONTH = LocalDate.of(2026, 10, 1);
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-27T10:00:00Z"), ZoneOffset.UTC);

    @Test
    void statusUsesFeatureLimitAndNeverReportsNegativeRemaining() {
        var usage = mock(AiCoachUsageRepository.class);
        var user = user();
        var row = new AiCoachUsage(user, MONTH, AiCoachFeature.GOAL);
        row.increment();
        row.increment();
        row.increment();
        row.increment();
        when(usage.findByUserIdAndUsageMonthAndFeature(7L, MONTH, AiCoachFeature.GOAL))
                .thenReturn(Optional.of(row));
        var quota = quota(usage, mock(AppUserRepository.class), 4, 3, 2, 4, 3, 3);

        assertEquals(new AiCoachQuota.Status(3, 4, 0), quota.status(user, AiCoachFeature.GOAL));
        assertEquals(new AiCoachQuota.Status(4, 0, 4), quota.status(user, AiCoachFeature.WEEKLY));
        assertEquals(new AiCoachQuota.Status(4, 0, 4), quota.status(user, AiCoachFeature.JOURNAL));
        assertEquals(new AiCoachQuota.Status(3, 0, 3), quota.status(user, AiCoachFeature.DAILY_FOCUS));
        assertEquals(new AiCoachQuota.Status(3, 0, 3), quota.status(user, AiCoachFeature.CHAT));
    }

    @Test
    void consumePersistsEachAttemptAndRejectsTheNextOneAtMonthlyLimit() {
        var usage = mock(AiCoachUsageRepository.class);
        var users = mock(AppUserRepository.class);
        var user = user();
        var saved = new AtomicReference<AiCoachUsage>();
        when(users.lockById(7L)).thenReturn(Optional.of(user));
        when(usage.findByUserIdAndUsageMonthAndFeature(7L, MONTH, AiCoachFeature.RESTART))
                .thenAnswer(invocation -> Optional.ofNullable(saved.get()));
        when(usage.save(any(AiCoachUsage.class))).thenAnswer(invocation -> {
            saved.set(invocation.getArgument(0));
            return saved.get();
        });
        var quota = quota(usage, users, 4, 3, 2, 4, 3, 3);

        assertEquals(new AiCoachQuota.Status(2, 1, 1), quota.consume(user, AiCoachFeature.RESTART));
        assertEquals(new AiCoachQuota.Status(2, 2, 0), quota.consume(user, AiCoachFeature.RESTART));
        var failure = assertThrows(ResponseStatusException.class,
                () -> quota.consume(user, AiCoachFeature.RESTART));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, failure.getStatusCode());
        assertEquals(2, saved.get().getRequestCount());
        verify(usage, times(2)).save(any(AiCoachUsage.class));
    }

    @Test
    void configuredLimitsAreBoundedToKeepAnEnvironmentMistakeSafe() {
        var quota = quota(mock(AiCoachUsageRepository.class), mock(AppUserRepository.class), 1000, -1, 2, 4, 1000, 1000);
        var user = user();

        assertEquals(new AiCoachQuota.Status(100, 0, 100), quota.status(user, AiCoachFeature.WEEKLY));
        assertEquals(new AiCoachQuota.Status(0, 0, 0), quota.status(user, AiCoachFeature.GOAL));
        assertEquals(new AiCoachQuota.Status(100, 0, 100), quota.status(user, AiCoachFeature.DAILY_FOCUS));
        assertEquals(new AiCoachQuota.Status(100, 0, 100), quota.status(user, AiCoachFeature.CHAT));
    }

    private AiCoachQuota quota(AiCoachUsageRepository usage, AppUserRepository users,
            int weekly, int goal, int restart, int journal, int dailyFocus, int chat) {
        return new AiCoachQuota(usage, users, CLOCK, weekly, goal, restart, journal, dailyFocus, chat);
    }

    private AppUser user() {
        var user = mock(AppUser.class);
        when(user.getId()).thenReturn(7L);
        return user;
    }
}
