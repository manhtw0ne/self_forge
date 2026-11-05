package com.selfforge.discipline.beta;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.feedback.FeedbackSubmissionRepository;
import com.selfforge.discipline.habit.HabitRepository;
import com.selfforge.discipline.coach.WeeklyCoachAdviceRepository;
import com.selfforge.discipline.coach.WeeklyCoachFeedbackDecision;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aggregate, access-restricted beta operations metrics. It deliberately
 * returns no user identifiers, text, device data, journal contents, or
 * individual activity.
 */
@Service
@Transactional(readOnly = true)
public class BetaMetricsService {
    private static final int MAX_RANGE_DAYS = 366;

    private final AppUserRepository users;
    private final HabitRepository habits;
    private final DailyCheckInRepository checkIns;
    private final FeedbackSubmissionRepository feedback;
    private final WeeklyCoachAdviceRepository weeklyAdvice;
    private final Clock clock;

    public BetaMetricsService(AppUserRepository users, HabitRepository habits,
                              DailyCheckInRepository checkIns, FeedbackSubmissionRepository feedback,
                              WeeklyCoachAdviceRepository weeklyAdvice,
                              Clock clock) {
        this.users = users;
        this.habits = habits;
        this.checkIns = checkIns;
        this.feedback = feedback;
        this.weeklyAdvice = weeklyAdvice;
        this.clock = clock;
    }

    public record Response(
            LocalDate from,
            LocalDate through,
            String timezone,
            Instant generatedAt,
            int registrations,
            int usersWhoCreatedHabit,
            int usersWhoCompletedCheckIn,
            int activatedUsers,
            int day1EligibleUsers,
            int usersActivatedWithinDay1,
            int day7EligibleUsers,
            int usersWithCheckInAfterDay7,
            long feedbackReports,
            long weeklyAiSuggestions,
            long weeklyAiRatings,
            long weeklyAiWillTry
    ) { }

    public Response report(LocalDate from, LocalDate through) {
        if (from == null || through == null || through.isBefore(from)
                || ChronoUnit.DAYS.between(from, through) + 1 > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("Khoảng beta không hợp lệ.");
        }
        Instant start = from.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant endExclusive = through.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<AppUser> cohort = users.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(start, endExclusive);
        int habitUsers = 0;
        int completedUsers = 0;
        int activated = 0;
        int eligibleDay1 = 0;
        int activatedWithinDay1 = 0;
        int eligibleDay7 = 0;
        int returnedAfterDay7 = 0;
        for (AppUser user : cohort) {
            Long userId = user.getId();
            boolean hasHabit = habits.existsByUserIdAndCreatedAtLessThan(userId, endExclusive);
            boolean completed = checkIns.existsByHabit_User_IdAndStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                    userId, CheckInStatus.COMPLETED, user.getCreatedAt(), endExclusive);
            if (hasHabit) habitUsers++;
            if (completed) completedUsers++;
            if (hasHabit && completed) activated++;

            Instant firstDay = user.getCreatedAt().plus(1, ChronoUnit.DAYS);
            if (!firstDay.isAfter(endExclusive)) {
                eligibleDay1++;
                boolean createdHabitWithinDay1 = habits
                        .existsByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(userId, user.getCreatedAt(), firstDay);
                boolean completedWithinDay1 = checkIns
                        .existsByHabit_User_IdAndStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                                userId, CheckInStatus.COMPLETED, user.getCreatedAt(), firstDay);
                if (createdHabitWithinDay1 && completedWithinDay1) activatedWithinDay1++;
            }

            Instant seventhDay = user.getCreatedAt().plus(7, ChronoUnit.DAYS);
            if (seventhDay.isBefore(endExclusive)) {
                eligibleDay7++;
                if (checkIns.existsByHabit_User_IdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(userId, seventhDay, endExclusive)) {
                    returnedAfterDay7++;
                }
            }
        }
        return new Response(from, through, "UTC", Instant.now(clock), cohort.size(), habitUsers, completedUsers,
                activated, eligibleDay1, activatedWithinDay1, eligibleDay7, returnedAfterDay7,
                feedback.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(start, endExclusive),
                weeklyAdvice.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(start, endExclusive),
                weeklyAdvice.countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndHelpfulnessRatingIsNotNull(start, endExclusive),
                weeklyAdvice.countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndFollowUpDecision(
                        start, endExclusive, WeeklyCoachFeedbackDecision.WILL_TRY));
    }
}
