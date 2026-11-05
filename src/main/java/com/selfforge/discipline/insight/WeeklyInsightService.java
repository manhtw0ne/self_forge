package com.selfforge.discipline.insight;

import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.pomodoro.PomodoroRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class WeeklyInsightService {
 private final DailyCheckInRepository checkIns;
 private final PomodoroRepository pomodoros;
 private final UserTime time;
 public WeeklyInsightService(DailyCheckInRepository checkIns, PomodoroRepository pomodoros, UserTime time) {
  this.checkIns=checkIns; this.pomodoros=pomodoros; this.time=time;
 }
 public record Evidence(Long id, LocalDate date, CheckInStatus status,Long habitId,String habitName) {}
 public record Snapshot(int version, LocalDate weekStart, LocalDate weekEnd, LocalDate observedThrough,
    String timezone, int completed, int failed, int skipped, int focusSessions, long focusMinutes,
    List<Evidence> evidence, List<Long> focusSourceIds, String suggestion) {}
 public Snapshot summarize(AppUser user, LocalDate selected) {
  LocalDate today=time.today(user);
  LocalDate date=selected==null?today:selected;
  if(date.isAfter(today) || date.isBefore(today.minusYears(1))) throw new IllegalArgumentException("Chọn ngày trong một năm qua, không chọn tương lai.");
  LocalDate start=date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
  LocalDate end=start.plusDays(6); LocalDate through=end.isAfter(today)?today:end;
  var rows=checkIns.findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(),start,through);
  int completed=0,failed=0,skipped=0;
  for(var row:rows) {
   if(row.getStatus()==CheckInStatus.COMPLETED) completed++;
   else if(row.getStatus()==CheckInStatus.FAILED) failed++;
   else if(row.getStatus()==CheckInStatus.SKIPPED) skipped++;
  }
  var focus=pomodoros.findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(
      user.getId(),time.day(user,start).start(),time.day(user,through).end());
  String suggestion=rows.isEmpty()?"FIRST_CHECK_IN":failed>=2?"SMALLER_STEP":skipped>=2?"REVIEW_SCHEDULE":"KEEP_SMALL_STEP";
  return new Snapshot(1,start,end,through,time.zone(user).getId(),completed,failed,skipped,focus.size(),
    focus.stream().mapToLong(s->s.getDurationMinutes()).sum(),
    rows.stream().map(r->new Evidence(r.getId(),r.getDate(),r.getStatus(),r.getHabit().getId(),r.getHabit().getName())).toList(),
    focus.stream().map(s->s.getId()).toList(),suggestion);
 }
}
