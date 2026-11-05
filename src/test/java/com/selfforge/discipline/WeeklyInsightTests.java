package com.selfforge.discipline;
import com.selfforge.discipline.insight.*;
import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.pomodoro.*;
import com.selfforge.discipline.common.UserTime;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class WeeklyInsightTests {
 @Test void summaryUsesOwnedRecordedDataAndAccountDateWithoutJournalContent() throws Exception {
  var checks=mock(DailyCheckInRepository.class);var focus=mock(PomodoroRepository.class);var user=mock(AppUser.class);
  when(user.getId()).thenReturn(7L);when(user.getTimezone()).thenReturn("Asia/Ho_Chi_Minh");
  var time=new UserTime(Clock.fixed(Instant.parse("2026-10-12T17:30:00Z"),ZoneOffset.UTC));
  var completed=mock(DailyCheckIn.class);when(completed.getId()).thenReturn(1L);when(completed.getDate()).thenReturn(LocalDate.parse("2026-10-12"));when(completed.getStatus()).thenReturn(CheckInStatus.COMPLETED);
  var failed=mock(DailyCheckIn.class);when(failed.getId()).thenReturn(2L);when(failed.getStatus()).thenReturn(CheckInStatus.FAILED);
  var skipped=mock(DailyCheckIn.class);when(skipped.getId()).thenReturn(3L);when(skipped.getStatus()).thenReturn(CheckInStatus.SKIPPED);
  var habit=mock(com.selfforge.discipline.habit.Habit.class);when(habit.getId()).thenReturn(11L);when(habit.getName()).thenReturn("Read");for(var row:List.of(completed,failed,skipped))when(row.getHabit()).thenReturn(habit);
  when(checks.findByHabit_User_IdAndDateBetweenOrderByDateAsc(7L,LocalDate.parse("2026-10-12"),LocalDate.parse("2026-10-13"))).thenReturn(List.of(completed,failed,skipped));
  var session=mock(PomodoroSession.class);when(session.getId()).thenReturn(9L);when(session.getDurationMinutes()).thenReturn(25);
  when(focus.findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(eq(7L),any(),any())).thenReturn(List.of(session));
  var result=new WeeklyInsightService(checks,focus,time).summarize(user,null);
  assertEquals(11L,result.evidence().getFirst().habitId());assertEquals("Read",result.evidence().getFirst().habitName());
  assertEquals(1,result.completed());assertEquals(1,result.failed());assertEquals(1,result.skipped());assertEquals(25,result.focusMinutes());
  assertEquals(LocalDate.parse("2026-10-13"),result.observedThrough());assertEquals(List.of(9L),result.focusSourceIds());
  verify(focus).findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(7L,Instant.parse("2026-10-11T17:00:00Z"),Instant.parse("2026-10-13T17:00:00Z"));
  verify(completed,never()).getNote();verify(failed,never()).getNote();verify(session,never()).getNote();
 }
 @Test void emptyWeekDoesNotInventFailureAndInvalidDatesNeverQueryData() {
  var checks=mock(DailyCheckInRepository.class);var focus=mock(PomodoroRepository.class);var user=mock(AppUser.class);
  when(user.getId()).thenReturn(8L);when(user.getTimezone()).thenReturn("UTC");
  var service=new WeeklyInsightService(checks,focus,new UserTime(Clock.fixed(Instant.parse("2026-10-13T12:00:00Z"),ZoneOffset.UTC)));
  var result=service.summarize(user,LocalDate.parse("2026-10-05"));
  assertEquals("FIRST_CHECK_IN",result.suggestion());assertEquals(0,result.failed());assertEquals(LocalDate.parse("2026-10-11"),result.observedThrough());
  clearInvocations(checks,focus);
  assertThrows(IllegalArgumentException.class,()->service.summarize(user,LocalDate.parse("2026-10-14")));
  assertThrows(IllegalArgumentException.class,()->service.summarize(user,LocalDate.parse("2025-10-12")));
  verifyNoInteractions(checks,focus);
 }
}
