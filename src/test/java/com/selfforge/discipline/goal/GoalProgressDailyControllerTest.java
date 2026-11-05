package com.selfforge.discipline.goal;
import com.selfforge.discipline.auth.*;import com.selfforge.discipline.common.UserTime;
import jakarta.servlet.http.HttpServletRequest;import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;import java.time.*;import java.util.*;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;
class GoalProgressDailyControllerTest {
 @Test void aggregatesHistoricalUnitsAndCorrectionsInAccountTimezone(){
  var current=mock(CurrentUserService.class);var goals=mock(GoalRepository.class);var history=mock(GoalProgressCorrectionRepository.class);var user=mock(AppUser.class);var request=mock(HttpServletRequest.class);
  when(current.requireUser(request)).thenReturn(user);when(user.getId()).thenReturn(4L);when(user.getTimezone()).thenReturn("Asia/Ho_Chi_Minh");when(goals.findByIdAndUserId(8L,4L)).thenReturn(Optional.of(mock(Goal.class)));
  var time=new UserTime(Clock.fixed(Instant.parse("2026-10-16T03:00:00Z"),ZoneOffset.UTC));
  var start=Instant.parse("2026-10-09T17:00:00Z");var end=Instant.parse("2026-10-16T17:00:00Z");
  var rows=List.of(row("ADD","pages",0,5),row("CORRECTION","pages",5,2),row("CORRECTION","pages",2,4),row("ADD","books",0,1));when(history.dailyRange(4L,8L,start,end)).thenReturn(rows);
  var response=new GoalProgressDailyController(current,goals,history,time).get(8L,7,request);
  assertEquals(LocalDate.parse("2026-10-10"),response.fromDate());assertEquals(2,response.items().size());
  assertEquals(new GoalProgressDailyController.Activity(LocalDate.parse("2026-10-16"),"pages",1,2,5,2,3),response.items().getFirst());
  assertEquals("books",response.items().getLast().unit());assertEquals(1,response.items().getLast().added());
  verify(history).dailyRange(4L,8L,start,end);
 }
 @Test void ownershipAndWindowAreCheckedBeforeReadingHistory(){
  var current=mock(CurrentUserService.class);var goals=mock(GoalRepository.class);var history=mock(GoalProgressCorrectionRepository.class);var user=mock(AppUser.class);var request=mock(HttpServletRequest.class);when(current.requireUser(request)).thenReturn(user);when(user.getId()).thenReturn(4L);
  var controller=new GoalProgressDailyController(current,goals,history,new UserTime(Clock.systemUTC()));
  assertThrows(IllegalArgumentException.class,()->controller.get(8L,365,request));assertThrows(EntityNotFoundException.class,()->controller.get(8L,30,request));verifyNoInteractions(history);
 }
 private GoalProgressCorrection row(String kind,String unit,int from,int to){var row=mock(GoalProgressCorrection.class);when(row.getKind()).thenReturn(kind);when(row.getUnit()).thenReturn(unit);when(row.getFromValue()).thenReturn(from);when(row.getToValue()).thenReturn(to);when(row.getCreatedAt()).thenReturn(Instant.parse("2026-10-15T18:00:00Z"));return row;}
}
