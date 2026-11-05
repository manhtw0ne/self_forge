package com.selfforge.discipline.stats;
import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.pomodoro.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@Service
@Transactional(readOnly=true)
public class MonthlyActivityService {
 private final DailyCheckInRepository checkIns;private final PomodoroRepository focus;private final UserTime time;
 public MonthlyActivityService(DailyCheckInRepository checkIns,PomodoroRepository focus,UserTime time){this.checkIns=checkIns;this.focus=focus;this.time=time;}
 public record Day(LocalDate date,int completed,int failed,int skipped,int focusSessions,int focusMinutes) {}
 public record HabitActivity(Long habitId,String habitName,boolean active,int completed,int failed,int skipped,int focusSessions,int focusMinutes) {}
 public record Summary(YearMonth month,LocalDate startDate,LocalDate endDate,LocalDate observedThrough,String timezone,int completed,int failed,int skipped,int focusSessions,int focusMinutes,int recordedDays,List<Day> days,int unlinkedFocusSessions,int unlinkedFocusMinutes,List<HabitActivity> habits) {}
 public Summary summarize(AppUser user,YearMonth selected){
  var today=time.today(user);var current=YearMonth.from(today);var month=selected==null?current:selected;
  if(month.isAfter(current)||month.isBefore(current.minusMonths(23)))throw new IllegalArgumentException("Invalid activity month");
  var start=month.atDay(1);var end=month.atEndOfMonth();var through=end.isAfter(today)?today:end;var rows=checkIns.findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(),start,through);
  var sessions=focus.findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(user.getId(),time.day(user,start).start(),time.day(user,through).end()).stream().filter(row->row.getDurationMinutes()>=25&&row.getDurationMinutes()<=120&&(row.getHabit()==null||row.getHabit().getUser().getId().equals(user.getId()))).toList();
  Map<LocalDate,int[]> counts=new HashMap<>();
  for(var row:rows){var values=counts.computeIfAbsent(row.getDate(),ignored->new int[5]);switch(row.getStatus()){case COMPLETED->values[0]++;case FAILED->values[1]++;case SKIPPED->values[2]++;}}
  for(var row:sessions){var values=counts.computeIfAbsent(row.getStartedAt().atZone(time.zone(user)).toLocalDate(),ignored->new int[5]);values[3]++;values[4]+=row.getDurationMinutes();}
  var days=new ArrayList<Day>();int[] totals=new int[5];int recorded=0;
  for(var date=start;!date.isAfter(through);date=date.plusDays(1)){var values=counts.getOrDefault(date,new int[5]);for(int i=0;i<5;i++)totals[i]+=values[i];if(values[0]+values[1]+values[2]+values[3]>0)recorded++;days.add(new Day(date,values[0],values[1],values[2],values[3],values[4]));}
  Map<Long,int[]> byHabit=new HashMap<>();Map<Long,com.selfforge.discipline.habit.Habit> habitSources=new HashMap<>();int freeCount=0,freeMinutes=0;
  for(var row:rows){var habit=row.getHabit();habitSources.put(habit.getId(),habit);var values=byHabit.computeIfAbsent(habit.getId(),ignored->new int[5]);switch(row.getStatus()){case COMPLETED->values[0]++;case FAILED->values[1]++;case SKIPPED->values[2]++;}}
  for(var row:sessions){var habit=row.getHabit();if(habit==null){freeCount++;freeMinutes+=row.getDurationMinutes();continue;}habitSources.put(habit.getId(),habit);var values=byHabit.computeIfAbsent(habit.getId(),ignored->new int[5]);values[3]++;values[4]+=row.getDurationMinutes();}
  var habitDetails=byHabit.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(entry->{var habit=habitSources.get(entry.getKey());var values=entry.getValue();return new HabitActivity(habit.getId(),habit.getName(),habit.isActive(),values[0],values[1],values[2],values[3],values[4]);}).toList();
  return new Summary(month,start,end,through,time.zone(user).getId(),totals[0],totals[1],totals[2],totals[3],totals[4],recorded,days,freeCount,freeMinutes,habitDetails);
 }
}
