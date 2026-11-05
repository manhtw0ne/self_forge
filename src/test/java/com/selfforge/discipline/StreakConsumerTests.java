package com.selfforge.discipline;

import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.dashboard.DashboardService;
import com.selfforge.discipline.habit.*;
import com.selfforge.discipline.reward.*;
import com.selfforge.discipline.streak.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:streak-consumers;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@Transactional
class StreakConsumerTests {
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26); // Monday

    @TestConfiguration
    static class TimeConfig {
        @Bean @Primary Clock streakTestClock() {
            return Clock.fixed(TODAY.atTime(12, 0).toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
        }
    }

    @Autowired AppUserRepository users;
    @Autowired HabitRepository habits;
    @Autowired DailyCheckInRepository checks;
    @Autowired DashboardService dashboard;
    @Autowired RewardService rewards;
    @Autowired UserAchievementRepository earned;
    @Autowired StreakFreezeService freezeService;
    @Autowired StreakFreezeRepository freezes;
    @Autowired CheckInService checkInService;
    @Autowired HabitService habitService;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired HabitStateHistoryService stateHistory;
    @Autowired StreakService streaks;

    @Test void pausingAfterCheckInKeepsItsCompletionCorrectionsAndAccounting() {
        var habit = createHabit(7);
        var user = habit.getUser();
        checks.save(new DailyCheckIn(habit, TODAY.minusDays(1), CheckInStatus.COMPLETED, "Earlier work"));
        var original = checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(
                habit.getId(), TODAY, CheckInStatus.COMPLETED, "Before pause"));
        int completedXp = rewards.getUserProgress(user).totalXp();
        assertEquals(2, streaks.current(user.getId(), habit.getId(), TODAY));

        habitService.deactivate(user, habit.getId());
        entityManager.flush();
        entityManager.clear();
        assertEquals(2, streaks.current(user.getId(), habit.getId(), TODAY));
        assertEquals(completedXp, rewards.getUserProgress(user).totalXp());

        checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(
                habit.getId(), TODAY, CheckInStatus.FAILED, "Corrected while paused"));
        assertEquals(0, streaks.current(user.getId(), habit.getId(), TODAY));
        checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(
                habit.getId(), TODAY, CheckInStatus.COMPLETED, "Restored correction"));
        entityManager.flush();
        entityManager.clear();
        assertEquals(2, streaks.current(user.getId(), habit.getId(), TODAY));
        assertEquals(completedXp, rewards.getUserProgress(user).totalXp());
        var saved = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), TODAY).orElseThrow();
        assertEquals(original.id(), saved.getId());
        assertEquals(7, saved.getTargetPerWeekSnapshot());
        assertEquals("MON,TUE,WED,THU,FRI,SAT,SUN", saved.getScheduledDaysSnapshot());
        assertEquals(2, checks.count());
        assertFalse(habitService.getHabit(user, habit.getId()).isActive());
    }

    @Test void newHabitHistoryPreservesSameDayChangesAndTheAccountCalendar() {
        var user = users.save(new AppUser(UUID.randomUUID() + "@example.test", "Calendar history", "unused"));
        user.updateProfile(null, null, "Pacific/Kiritimati", null);
        var created = habitService.create(user, new HabitRequests.CreateHabitRequest("History", "", Difficulty.MEDIUM, 3, null, null, null));
        habitService.update(user, created.id(), new HabitRequests.UpdateHabitRequest(null, "Metadata only", null, null, null, null, null, null, null));
        habitService.update(user, created.id(), new HabitRequests.UpdateHabitRequest(null, null, null, 7, null, null, null, null, null));
        habitService.update(user, created.id(), new HabitRequests.UpdateHabitRequest(null, null, null, 7, null, null, null, null, null));
        habitService.deactivate(user, created.id());
        habitService.deactivate(user, created.id());
        habitService.update(user, created.id(), new HabitRequests.UpdateHabitRequest(null, null, null, null, null, true, null, null, null));
        entityManager.flush();
        entityManager.clear();
        var items = stateHistory.history(user, created.id(), null).items();
        assertEquals(4, items.size());
        assertTrue(items.get(0).active());
        assertFalse(items.get(1).active());
        assertEquals(7, items.get(2).targetPerWeek());
        assertEquals(HabitStateHistory.Kind.CREATED, items.get(3).kind());
        assertEquals(3, items.get(3).targetPerWeek());
        for (var item : items) {
            assertEquals(TODAY.plusDays(1), item.calendarDate());
            assertEquals("Pacific/Kiritimati", item.timezone());
            assertEquals(TODAY.atTime(12, 0).toInstant(ZoneOffset.UTC), item.recordedAt());
        }
    }

    @Test void persistedHistoricalRestDaysSurviveIncreasingTheCurrentTargetToDaily() {
        var habit = createHabit(7);
        // TODAY is Monday. The preceding week followed a recorded weekday schedule.
        entityManager.createNativeQuery("insert into habit_state_history " +
                "(habit_id,kind,target_per_week,scheduled_days,active,recorded_at,calendar_date,timezone) " +
                "values (:habitId,'OBSERVED',5,'MON,TUE,WED,THU,FRI',true,:instant,:date,'UTC')")
                .setParameter("habitId", habit.getId())
                .setParameter("instant", TODAY.minusDays(7).atStartOfDay().toInstant(ZoneOffset.UTC))
                .setParameter("date", TODAY.minusDays(7)).executeUpdate();
        entityManager.createNativeQuery("insert into habit_state_history " +
                "(habit_id,kind,target_per_week,scheduled_days,active,recorded_at,calendar_date,timezone) " +
                "values (:habitId,'CHANGED',7,'MON,TUE,WED,THU,FRI,SAT,SUN',true,:instant,:date,'UTC')")
                .setParameter("habitId", habit.getId())
                .setParameter("instant", TODAY.atStartOfDay().toInstant(ZoneOffset.UTC))
                .setParameter("date", TODAY).executeUpdate();
        checks.save(new DailyCheckIn(habit, TODAY, CheckInStatus.COMPLETED, ""));
        for (int i = 3; i <= 7; i++) {
            checks.save(new DailyCheckIn(habit, TODAY.minusDays(i), CheckInStatus.COMPLETED, ""));
        }
        entityManager.flush();
        entityManager.clear();
        assertEquals(6, dashboard.today(habit.getUser(), null).habits().getFirst().currentStreak());
        assertEquals(6, checks.count()); // No fabricated weekend rows.
    }

    @Test void dashboardDateUsesRecordedHistoricalScheduleAndPauseState() {
        var habit = createHabit(7);
        var sunday = TODAY.minusDays(1);
        entityManager.createNativeQuery("insert into habit_state_history " +
                        "(habit_id,kind,target_per_week,scheduled_days,active,recorded_at,calendar_date,timezone) " +
                        "values (:habitId,'OBSERVED',5,'MON,TUE,WED,THU,FRI',true,:instant,:date,'UTC')")
                .setParameter("habitId", habit.getId())
                .setParameter("instant", sunday.minusDays(7).atStartOfDay().toInstant(ZoneOffset.UTC))
                .setParameter("date", sunday.minusDays(7)).executeUpdate();
        entityManager.flush();
        entityManager.clear();

        var historicalRest = dashboard.today(habit.getUser(), sunday).habits().getFirst();
        assertEquals("MON,TUE,WED,THU,FRI", historicalRest.scheduledDays());
        assertFalse(historicalRest.scheduledToday());

        entityManager.createNativeQuery("insert into habit_state_history " +
                        "(habit_id,kind,target_per_week,scheduled_days,active,recorded_at,calendar_date,timezone) " +
                        "values (:habitId,'CHANGED',5,'MON,TUE,WED,THU,FRI',false,:instant,:date,'UTC')")
                .setParameter("habitId", habit.getId())
                .setParameter("instant", sunday.atStartOfDay().toInstant(ZoneOffset.UTC))
                .setParameter("date", sunday).executeUpdate();
        entityManager.flush();
        entityManager.clear();

        var historicalPause = dashboard.today(habit.getUser(), sunday).habits().getFirst();
        assertFalse(historicalPause.scheduledToday());
    }

    @Test void legacyHistoryStartsWithObservedStateWithoutInventingCreationDates() {
        var habit = createHabit(5); // Legacy fixture inserted without the recording service.
        var user = habit.getUser();
        assertTrue(stateHistory.history(user, habit.getId(), null).items().isEmpty());
        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(null, "Metadata", null, null, null, null, null, null, null));
        assertTrue(stateHistory.history(user, habit.getId(), null).items().isEmpty());
        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(null, null, null, 7, null, null, null, null, null));
        var items = stateHistory.history(user, habit.getId(), null).items();
        assertEquals(2, items.size());
        assertEquals(HabitStateHistory.Kind.CHANGED, items.get(0).kind());
        assertEquals(7, items.get(0).targetPerWeek());
        assertEquals(HabitStateHistory.Kind.OBSERVED, items.get(1).kind());
        assertEquals(5, items.get(1).targetPerWeek());
        assertEquals(TODAY, items.get(1).calendarDate());
    }

    @Test void repeatedTargetEditsKeepEachRecordedDaysFirstSnapshot() {
        var habit = history(5, CheckInStatus.SKIPPED);
        var user = habit.getUser();
        for (int target : new int[]{7, 3, 6, 5}) {
            habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                    null, null, null, target, null, null, null, null, null));
            entityManager.flush();
            entityManager.clear();
            assertEquals(7, dashboard.today(user, null).habits().getFirst().currentStreak());
            var sunday = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), TODAY.minusDays(1)).orElseThrow();
            assertEquals(5, sunday.getTargetPerWeekSnapshot());
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 7})
    void backdatedCheckInUsesKnownHistoricalScheduleAndKeepsItOnCorrection(int currentTarget) {
        var habit = createHabit(currentTarget);
        var user = habit.getUser();
        var date = TODAY.minusDays(5);
        recordSchedule(habit, date.minusDays(2), 3, "TUE,THU,SAT");
        checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(
                habit.getId(), date, CheckInStatus.SKIPPED, "Historical rest day"));
        var original = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), date).orElseThrow();
        Long id = original.getId();
        assertEquals(3, original.getTargetPerWeekSnapshot());
        assertEquals("TUE,THU,SAT", original.getScheduledDaysSnapshot());
        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                null, null, null, 5, null, null, null, null, null));
        for (var status : new CheckInStatus[]{CheckInStatus.COMPLETED, CheckInStatus.SKIPPED, CheckInStatus.SKIPPED}) {
            checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(habit.getId(), date, status, "Correction"));
            entityManager.flush();
            entityManager.clear();
            var saved = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), date).orElseThrow();
            assertEquals(id, saved.getId());
            assertEquals(3, saved.getTargetPerWeekSnapshot());
            assertEquals("TUE,THU,SAT", saved.getScheduledDaysSnapshot());
        }
        assertEquals(1, checks.count());
    }

    @Test void backdatedSnapshotUsesLastSameDayTransitionAndExcludesLaterDates() {
        var habit = createHabit(7);
        var date = TODAY.minusDays(3);
        recordSchedule(habit, date, 3, "MON,WED,FRI");
        recordSchedule(habit, date, 2, "TUE,THU");
        recordSchedule(habit, TODAY, 7, "MON,TUE,WED,THU,FRI,SAT,SUN");
        checkInService.upsert(habit.getUser(), new CheckInRequests.UpsertCheckInRequest(
                habit.getId(), date, CheckInStatus.SKIPPED, "Last transition on selected day"));
        entityManager.flush();
        entityManager.clear();
        var saved = checks.findByHabit_User_IdAndHabitIdAndDate(habit.getUser().getId(), habit.getId(), date).orElseThrow();
        assertEquals(2, saved.getTargetPerWeekSnapshot());
        assertEquals("TUE,THU", saved.getScheduledDaysSnapshot());
        assertEquals(3, stateHistory.history(habit.getUser(), habit.getId(), null).items().size());
    }

    @Test void timezoneBacktrackKeepsTheLaterRecordedStateForFollowingCalendarDays() {
        var habit = createHabit(7);
        // The first action happened in a far-ahead timezone on Monday. The
        // user then moved west, so a later action is labelled Sunday even
        // though it is newer in real time. The newer state must not disappear
        // when resolving Monday's schedule or whether new activity is allowed.
        recordState(habit, TODAY, 3, "WED,FRI,SUN", false,
                TODAY.atTime(8, 0).toInstant(ZoneOffset.UTC), "Pacific/Kiritimati");
        recordState(habit, TODAY.minusDays(1), 5, "MON,TUE,WED,THU,FRI", true,
                TODAY.atTime(9, 0).toInstant(ZoneOffset.UTC), "America/Adak");

        var resolved = stateHistory.scheduleForNewCheckIn(habit, TODAY);
        assertEquals(5, resolved.targetPerWeek());
        assertEquals("MON,TUE,WED,THU,FRI", resolved.scheduledDays());
        assertTrue(stateHistory.allowsNewCheckIn(habit, TODAY));
        assertTrue(dashboard.today(habit.getUser(), TODAY).habits().getFirst().scheduledToday());

        checkInService.upsert(habit.getUser(), new CheckInRequests.UpsertCheckInRequest(
                habit.getId(), TODAY, CheckInStatus.SKIPPED, "Timezone transition"));
        var saved = checks.findByHabit_User_IdAndHabitIdAndDate(habit.getUser().getId(), habit.getId(), TODAY).orElseThrow();
        assertEquals(5, saved.getTargetPerWeekSnapshot());
        assertEquals("MON,TUE,WED,THU,FRI", saved.getScheduledDaysSnapshot());
    }

    private void recordSchedule(Habit habit, LocalDate date, int target, String days) {
        recordState(habit, date, target, days, true, date.atStartOfDay().toInstant(ZoneOffset.UTC), "UTC");
    }

    private void recordState(Habit habit, LocalDate date, int target, String days, boolean active,
                             Instant recordedAt, String timezone) {
        entityManager.createNativeQuery("insert into habit_state_history " +
                "(habit_id,kind,target_per_week,scheduled_days,active,recorded_at,calendar_date,timezone) " +
                "values (:habitId,'CHANGED',:target,:days,:active,:instant,:date,:timezone)")
                .setParameter("habitId", habit.getId()).setParameter("target", target).setParameter("days", days)
                .setParameter("active", active).setParameter("instant", recordedAt)
                .setParameter("date", date).setParameter("timezone", timezone).executeUpdate();
    }

    @Test void backdatedCheckInWithoutHistoryUsesRecordingTimeTargetAndKeepsItThroughCorrections() {
        var habit = createHabit(5);
        var user = habit.getUser();
        var sunday = TODAY.minusDays(1);
        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                null, null, null, 7, null, null, null, null, null));
        checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(habit.getId(), sunday, CheckInStatus.SKIPPED, "Backdated"));
        var original = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), sunday).orElseThrow();
        Long originalId = original.getId();
        assertEquals(7, original.getTargetPerWeekSnapshot());
        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                null, null, null, 5, null, null, null, null, null));
        for (var status : new CheckInStatus[]{CheckInStatus.COMPLETED, CheckInStatus.SKIPPED, CheckInStatus.SKIPPED}) {
            checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(habit.getId(), sunday, status, "Correction"));
            entityManager.flush();
            entityManager.clear();
            var saved = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), sunday).orElseThrow();
            assertEquals(originalId, saved.getId());
            assertEquals(7, saved.getTargetPerWeekSnapshot());
        }
    }

    @Test void legacyNullSnapshotUsesExistingFallbackWithoutInventingHistoryOnNoteEdit() {
        var habit = history(5, CheckInStatus.SKIPPED);
        var user = habit.getUser();
        entityManager.flush();
        entityManager.createNativeQuery("update daily_check_in set target_per_week_snapshot=null, scheduled_days_snapshot=null where habit_id=:habitId")
                .setParameter("habitId", habit.getId()).executeUpdate();
        entityManager.clear();
        assertEquals(7, dashboard.today(user, null).habits().getFirst().currentStreak());
        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                null, null, null, 7, null, null, null, null, null));
        assertEquals(1, dashboard.today(user, null).habits().getFirst().currentStreak());
        checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(
                habit.getId(), TODAY.minusDays(1), CheckInStatus.SKIPPED, "Legacy note"));
        entityManager.flush();
        entityManager.clear();
        var saved = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), TODAY.minusDays(1)).orElseThrow();
        assertNull(saved.getTargetPerWeekSnapshot());
        assertNull(saved.getScheduledDaysSnapshot());
        assertEquals("Legacy note", saved.getNote());
        assertEquals(1, dashboard.today(user, null).habits().getFirst().currentStreak());
    }

    @Test void selectedWeekdaysDriveRestDaysAndAreSnapshottedWithTheCheckIn() {
        var user = users.save(new AppUser(UUID.randomUUID() + "@example.test", "Selected weekdays", "unused"));
        var created = habitService.create(user, new HabitRequests.CreateHabitRequest(
                "Custom schedule", "", Difficulty.MEDIUM, 3, null, null, null, "WED,FRI,SUN"));
        var habit = habitService.getHabit(user, created.id());
        assertEquals("WED,FRI,SUN", habit.getScheduledDays());

        for (int offset = 1; offset <= 7; offset++) {
            LocalDate date = TODAY.minusDays(offset);
            if (HabitSchedule.includes(habit.getScheduledDays(), date)) {
                checks.save(new DailyCheckIn(habit, date, CheckInStatus.COMPLETED, null));
            }
        }
        entityManager.flush();
        entityManager.clear();
        assertEquals(3, dashboard.today(user, null).habits().getFirst().currentStreak());
        var sunday = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), TODAY.minusDays(1)).orElseThrow();
        assertEquals("WED,FRI,SUN", sunday.getScheduledDaysSnapshot());

        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                null, null, null, 3, null, null, null, null, null, null, "MON,WED,FRI"));
        entityManager.flush();
        entityManager.clear();
        assertEquals(3, dashboard.today(user, null).habits().getFirst().currentStreak());
    }

    @ParameterizedTest
    @ValueSource(ints = {5, 7})
    void changingWeeklyTargetDoesNotReinterpretRecordedSkippedDays(int originalTarget) {
        var habit = history(originalTarget, CheckInStatus.SKIPPED);
        var user = habit.getUser();
        int expectedStreak = originalTarget == 5 ? 7 : 1;
        assertEquals(expectedStreak, dashboard.today(user, null).habits().getFirst().currentStreak());
        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                null, null, null, originalTarget == 5 ? 7 : 5, null, null, null, null, null));
        entityManager.flush();
        entityManager.clear();
        assertEquals(expectedStreak, dashboard.today(user, null).habits().getFirst().currentStreak());
        rewards.checkAndGrantAchievements(user);
        assertEquals(originalTarget == 5, earned.existsByUserIdAndAchievementCode(user.getId(), "STREAK_7"));
    }

    @ParameterizedTest
    @EnumSource(value = CheckInStatus.class, names = {"FAILED", "SKIPPED"})
    void freezeProtectsRecordedDayWithoutRefundingXpOrChangingCheckIn(CheckInStatus status) {
        var habit = createHabit(7);
        var user = habit.getUser();
        for (int offset = 2; offset <= 8; offset++) {
            checks.save(new DailyCheckIn(habit, TODAY.minusDays(offset), CheckInStatus.COMPLETED, null));
        }
        rewards.addXp(user, 100);
        var yesterday = TODAY.minusDays(1);
        checkInService.upsert(user, new CheckInRequests.UpsertCheckInRequest(habit.getId(), yesterday, status, "Keep me"));
        int xpBeforeFreeze = rewards.getUserProgress(user).totalXp();
        assertEquals(status == CheckInStatus.FAILED ? 80 : 100, xpBeforeFreeze);
        assertEquals(0, dashboard.today(user, null).habits().getFirst().currentStreak());

        var first = freezeService.useFreeze(user, habit.getId(), yesterday);
        var retry = freezeService.useFreeze(user, habit.getId(), yesterday);
        assertEquals(first.id(), retry.id());
        assertEquals(0, freezeService.remainingFreezes(user));
        assertEquals(1, freezes.findByUserIdAndHabitIdAndFreezeDateBetween(
                user.getId(), habit.getId(), yesterday, TODAY).size());
        assertEquals(7, dashboard.today(user, null).habits().getFirst().currentStreak());
        assertEquals(xpBeforeFreeze, rewards.getUserProgress(user).totalXp());
        var recorded = checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), yesterday).orElseThrow();
        assertEquals(status, recorded.getStatus());
        assertEquals("Keep me", recorded.getNote());
        assertEquals(status == CheckInStatus.FAILED ? -20 : 0, recorded.getAppliedXp());

        // Explicitly checking achievements may grant STREAK_7; replay still grants it once.
        rewards.checkAndGrantAchievements(user);
        assertTrue(earned.existsByUserIdAndAchievementCode(user.getId(), "STREAK_7"));
        int xpAfterAchievement = rewards.getUserProgress(user).totalXp();
        rewards.checkAndGrantAchievements(user);
        assertEquals(xpAfterAchievement, rewards.getUserProgress(user).totalXp());
    }

    @Test void completedFrozenDayCountsOnceAndDoesNotMintAnExtraStreakAchievement() {
        var habit = createHabit(7);
        for (int offset = 0; offset < 6; offset++) {
            checks.save(new DailyCheckIn(habit, TODAY.minusDays(offset), CheckInStatus.COMPLETED, null));
        }
        freezeService.useFreeze(habit.getUser(), habit.getId(), TODAY.minusDays(1));
        assertEquals(6, dashboard.today(habit.getUser(), null).habits().getFirst().currentStreak());
        rewards.checkAndGrantAchievements(habit.getUser());
        assertFalse(earned.existsByUserIdAndAchievementCode(habit.getUser().getId(), "STREAK_7"));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void pauseAndRestoreKeepHistoryWithoutFillingMissingRequiredDays(boolean missingRequiredDay) {
        var habit = history(5, CheckInStatus.SKIPPED);
        var user = habit.getUser();
        if (missingRequiredDay) {
            checks.delete(checks.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), TODAY.minusDays(3)).orElseThrow());
        }
        long checkInCount = checks.count();
        habitService.deactivate(user, habit.getId());
        assertTrue(dashboard.today(user, null).habits().isEmpty());
        rewards.checkAndGrantAchievements(user);
        assertFalse(earned.existsByUserIdAndAchievementCode(user.getId(), "STREAK_7"));
        // FIRST_CHECKIN is account-wide and can be granted above even while this habit is paused.
        int xpBeforeRestore = rewards.getUserProgress(user).totalXp();

        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                null, null, null, null, null, true, null, null, null));
        assertEquals(missingRequiredDay ? 1 : 7, dashboard.today(user, null).habits().getFirst().currentStreak());
        assertEquals(checkInCount, checks.count());
        assertEquals(xpBeforeRestore, rewards.getUserProgress(user).totalXp());
        assertTrue(freezes.findByUserIdAndHabitIdAndFreezeDateBetween(user.getId(), habit.getId(), TODAY.minusDays(8), TODAY).isEmpty());
    }

    @Test void restoredHabitCannotCreateANewCheckInInsideItsRecordedPauseWindow() {
        var user = users.save(new AppUser(UUID.randomUUID() + "@example.test", "Pause window", "unused"));
        var habit = habitService.create(user, new HabitRequests.CreateHabitRequest(
                "Pause-aware", "", Difficulty.EASY, 3, null, null, null));
        habitService.deactivate(user, habit.id());
        entityManager.flush();
        // The test clock is fixed at TODAY. Move only the persisted pause fact
        // back two calendar days so the reactivation below gives us a real
        // inactive interval to exercise without forging a check-in.
        entityManager.createNativeQuery("update habit_state_history set calendar_date=:date where habit_id=:habitId and kind='CHANGED'")
                .setParameter("date", TODAY.minusDays(2)).setParameter("habitId", habit.id()).executeUpdate();
        entityManager.clear();

        habitService.update(user, habit.id(), new HabitRequests.UpdateHabitRequest(
                null, null, null, null, null, true, null, null, null));
        assertThrows(IllegalStateException.class, () -> checkInService.upsert(user,
                new CheckInRequests.UpsertCheckInRequest(habit.id(), TODAY.minusDays(1), CheckInStatus.COMPLETED, "")));

        // It remains possible to record new work after the restore date.
        assertEquals(CheckInStatus.COMPLETED, checkInService.upsert(user,
                new CheckInRequests.UpsertCheckInRequest(habit.id(), TODAY, CheckInStatus.COMPLETED, "")).status());
    }

    @Test void restoredHabitBridgesRecordedPauseDaysWithoutManufacturingCheckInsOrXp() {
        var habit = createHabit(7);
        var user = habit.getUser();
        checks.save(new DailyCheckIn(habit, TODAY.minusDays(3), CheckInStatus.COMPLETED, null));
        checks.save(new DailyCheckIn(habit, TODAY, CheckInStatus.COMPLETED, null));
        int xpBeforePause = rewards.getUserProgress(user).totalXp();

        habitService.deactivate(user, habit.getId());
        entityManager.flush();
        entityManager.createNativeQuery("update habit_state_history set calendar_date=:date where habit_id=:habitId and kind='CHANGED'")
                .setParameter("date", TODAY.minusDays(2)).setParameter("habitId", habit.getId()).executeUpdate();
        entityManager.clear();
        habitService.update(user, habit.getId(), new HabitRequests.UpdateHabitRequest(
                null, null, null, null, null, true, null, null, null));

        assertEquals(2, dashboard.today(user, null).habits().getFirst().currentStreak());
        assertEquals(2, checks.count());
        assertEquals(xpBeforePause, rewards.getUserProgress(user).totalXp());
    }

    @Test void partialWeekRestDaysPreserveDashboardStreakAndGrantAchievementOnce() {
        var habit = history(5, CheckInStatus.SKIPPED);
        var user = habit.getUser();
        assertEquals(7, dashboard.today(user, null).habits().getFirst().currentStreak());
        rewards.checkAndGrantAchievements(user);
        assertTrue(earned.existsByUserIdAndAchievementCode(user.getId(), "STREAK_7"));
        int xp = rewards.getUserProgress(user).totalXp();
        rewards.checkAndGrantAchievements(user);
        assertEquals(xp, rewards.getUserProgress(user).totalXp());
        assertEquals(1, earned.findByUserIdOrderByEarnedAtDesc(user.getId()).stream()
                .filter(row -> row.getAchievement().getCode().equals("STREAK_7")).count());
    }

    @Test void dailyHabitSkippedWeekendStillBreaksDashboardAndAchievementStreak() {
        assertBroken(history(7, CheckInStatus.SKIPPED));
    }

    @Test void failedRestDayStillBreaksDashboardAndAchievementStreak() {
        assertBroken(history(5, CheckInStatus.FAILED));
    }

    @Test void pausedHabitIsExcludedFromDashboardAndNewAchievementGrants() {
        var habit = history(5, CheckInStatus.SKIPPED);
        habit.update(null, null, null, null, null, false);
        assertTrue(dashboard.today(habit.getUser(), null).habits().isEmpty());
        rewards.checkAndGrantAchievements(habit.getUser());
        assertFalse(earned.existsByUserIdAndAchievementCode(habit.getUser().getId(), "STREAK_7"));
    }

    private void assertBroken(Habit habit) {
        assertEquals(1, dashboard.today(habit.getUser(), null).habits().getFirst().currentStreak());
        rewards.checkAndGrantAchievements(habit.getUser());
        assertFalse(earned.existsByUserIdAndAchievementCode(habit.getUser().getId(), "STREAK_7"));
    }

    private Habit history(int target, CheckInStatus restStatus) {
        var habit = createHabit(target);
        // Seven completed days, with a skipped/failed weekend between Friday and Monday.
        for (int offset = 0; offset <= 8; offset++) {
            var date = TODAY.minusDays(offset);
            var status = offset == 1 || offset == 2 ? restStatus : CheckInStatus.COMPLETED;
            checks.save(new DailyCheckIn(habit, date, status, null));
        }
        return habit;
    }

    private Habit createHabit(int target) {
        var user = users.save(new AppUser(UUID.randomUUID() + "@example.test", "Streak fixture", "unused"));
        return habits.save(new Habit(user, "Weekday habit", "", Difficulty.MEDIUM, target, null));
    }
}
