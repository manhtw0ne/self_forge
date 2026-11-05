package com.selfforge.discipline.beta;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.feedback.FeedbackSubmissionRepository;
import com.selfforge.discipline.habit.HabitRepository;
import com.selfforge.discipline.coach.WeeklyCoachAdviceRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class BetaMetricsServiceTests {
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final HabitRepository habits = mock(HabitRepository.class);
    private final DailyCheckInRepository checkIns = mock(DailyCheckInRepository.class);
    private final FeedbackSubmissionRepository feedback = mock(FeedbackSubmissionRepository.class);
    private final WeeklyCoachAdviceRepository weeklyAdvice = mock(WeeklyCoachAdviceRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-20T12:00:00Z"), ZoneOffset.UTC);
    private final BetaMetricsService service = new BetaMetricsService(users, habits, checkIns, feedback, weeklyAdvice, clock);

    @Test void reports_aggregate_activation_and_day_seven_return_without_user_content() {
        AppUser activated = user(1L, "2026-10-01T10:00:00Z");
        AppUser registeredOnly = user(2L, "2026-10-10T10:00:00Z");
        Instant activatedAt = activated.getCreatedAt();
        Instant daySeven = Instant.parse("2026-10-08T10:00:00Z");
        when(users.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
                Instant.parse("2026-10-01T00:00:00Z"), Instant.parse("2026-10-16T00:00:00Z")))
                .thenReturn(List.of(activated, registeredOnly));
        when(habits.existsByUserIdAndCreatedAtLessThan(1L, Instant.parse("2026-10-16T00:00:00Z"))).thenReturn(true);
        when(habits.existsByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                1L, activatedAt, activatedAt.plus(1, java.time.temporal.ChronoUnit.DAYS))).thenReturn(true);
        when(checkIns.existsByHabit_User_IdAndStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                eq(1L), eq(CheckInStatus.COMPLETED), eq(activatedAt), any())).thenReturn(true);
        when(checkIns.existsByHabit_User_IdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                eq(1L), eq(daySeven), any())).thenReturn(true);
        when(feedback.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(any(), any())).thenReturn(3L);
        when(weeklyAdvice.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(any(), any())).thenReturn(2L);
        when(weeklyAdvice.countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndHelpfulnessRatingIsNotNull(any(), any())).thenReturn(1L);
        when(weeklyAdvice.countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndFollowUpDecision(any(), any(), any())).thenReturn(1L);

        BetaMetricsService.Response result = service.report(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 15));

        assertEquals(2, result.registrations());
        assertEquals(1, result.usersWhoCreatedHabit());
        assertEquals(1, result.usersWhoCompletedCheckIn());
        assertEquals(1, result.activatedUsers());
        assertEquals(2, result.day1EligibleUsers());
        assertEquals(1, result.usersActivatedWithinDay1());
        assertEquals(1, result.day7EligibleUsers());
        assertEquals(1, result.usersWithCheckInAfterDay7());
        assertEquals(3, result.feedbackReports());
        assertEquals(2, result.weeklyAiSuggestions());
        assertEquals(1, result.weeklyAiRatings());
        assertEquals(1, result.weeklyAiWillTry());
        assertEquals("UTC", result.timezone());
        assertEquals(Instant.parse("2026-10-20T12:00:00Z"), result.generatedAt());
        verify(checkIns, never()).existsByHabit_User_IdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(eq(2L), any(), any());
    }

    @Test void does_not_count_activity_created_after_the_selected_reporting_window() {
        AppUser user = user(1L, "2026-10-01T10:00:00Z");
        Instant endExclusive = Instant.parse("2026-10-03T00:00:00Z");
        when(users.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(any(), eq(endExclusive)))
                .thenReturn(List.of(user));
        // A user can create a habit after the report ends. It must not rewrite
        // the historical activation funnel when the operator runs it later.
        when(habits.existsByUserIdAndCreatedAtLessThan(1L, endExclusive)).thenReturn(false);

        BetaMetricsService.Response result = service.report(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 2));

        assertEquals(0, result.usersWhoCreatedHabit());
        assertEquals(0, result.activatedUsers());
        assertEquals(1, result.day1EligibleUsers());
        assertEquals(0, result.usersActivatedWithinDay1());
        verify(habits).existsByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                1L, user.getCreatedAt(), user.getCreatedAt().plus(1, java.time.temporal.ChronoUnit.DAYS));
    }

    @Test void rejects_reversed_or_unbounded_windows_before_reading_data() {
        assertThrows(IllegalArgumentException.class, () -> service.report(LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 1)));
        assertThrows(IllegalArgumentException.class, () -> service.report(LocalDate.of(2025, 1, 1), LocalDate.of(2026, 1, 2)));
        verifyNoInteractions(users, habits, checkIns, feedback, weeklyAdvice);
    }

    private AppUser user(Long id, String createdAt) {
        AppUser user = mock(AppUser.class);
        when(user.getId()).thenReturn(id);
        when(user.getCreatedAt()).thenReturn(Instant.parse(createdAt));
        return user;
    }
}
