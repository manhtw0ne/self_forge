package com.selfforge.discipline.stats;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.HabitRepository;
import com.selfforge.discipline.pomodoro.PomodoroRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
@RestController @RequestMapping("/api/stats/habits") @Transactional(readOnly=true)
public class HabitTrendController {
 private final CurrentUserService current;private final HabitRepository habits;private final DailyCheckInRepository checkIns;private final UserTime time;private final PomodoroRepository focus;
 public HabitTrendController(CurrentUserService current,HabitRepository habits,DailyCheckInRepository checkIns,UserTime time,PomodoroRepository focus){this.current=current;this.habits=habits;this.checkIns=checkIns;this.time=time;this.focus=focus;}
 public record Evidence(Long id,LocalDate date,CheckInStatus status){}
 public record Counts(int completed,int failed,int skipped){}
 public record Focus(long sessions,long minutes){}
 public record Response(Long habitId,String habitName,int days,LocalDate start,LocalDate end,LocalDate previousStart,LocalDate previousEnd,Counts current,Counts previous,Focus currentFocus,Focus previousFocus,List<Evidence> evidence){}
 private Counts count(List<DailyCheckIn> rows,LocalDate start,LocalDate end){int completed=0,failed=0,skipped=0;for(var row:rows){if(row.getDate().isBefore(start)||row.getDate().isAfter(end))continue;switch(row.getStatus()){case COMPLETED->completed++;case FAILED->failed++;case SKIPPED->skipped++;}}return new Counts(completed,failed,skipped);}
 @GetMapping("/{habitId}") public Response get(@PathVariable Long habitId,@RequestParam(defaultValue="28") int days,HttpServletRequest request){
  var user=current.requireUser(request);if(days!=7&&days!=28)throw new IllegalArgumentException("Chọn khoảng 7 hoặc 28 ngày.");
  var habit=habits.findById(habitId).filter(row->row.getUser().getId().equals(user.getId())).orElseThrow(()->new EntityNotFoundException("Habit not found"));
  var end=time.today(user);var start=end.minusDays(days-1);var previousEnd=start.minusDays(1);var previousStart=start.minusDays(days);
  var rows=checkIns.findByHabit_User_IdAndHabitIdAndDateBetween(user.getId(),habitId,previousStart,end);rows.sort(java.util.Comparator.comparing(DailyCheckIn::getDate));
  var currentFocus=focus.habitFocusTotals(user.getId(),habitId,time.day(user,start).start(),time.now(user).toInstant());
  var previousFocus=focus.habitFocusTotals(user.getId(),habitId,time.day(user,previousStart).start(),time.day(user,start).start());
  return new Response(habitId,habit.getName(),days,start,end,previousStart,previousEnd,count(rows,start,end),count(rows,previousStart,previousEnd),new Focus(currentFocus.getSessions(),currentFocus.getMinutes()),new Focus(previousFocus.getSessions(),previousFocus.getMinutes()),rows.stream().map(row->new Evidence(row.getId(),row.getDate(),row.getStatus())).toList());
 }
}
