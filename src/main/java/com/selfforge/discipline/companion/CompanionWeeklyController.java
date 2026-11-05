package com.selfforge.discipline.companion;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.common.UserTime;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.*;import java.util.*;
@RestController @RequestMapping("/api/companion/weekly") @Transactional(readOnly=true)
public class CompanionWeeklyController {
 private final CurrentUserService current;private final DailyCheckInRepository checkIns;private final UserTime time;private final boolean available;
 public CompanionWeeklyController(CurrentUserService current,DailyCheckInRepository checkIns,UserTime time,@Value("${app.companion.enabled:true}") boolean available){this.current=current;this.checkIns=checkIns;this.time=time;this.available=available;}
 public record Source(Long id,Long habitId,String habitName,LocalDate date,int points){}
 public record Summary(LocalDate weekStart,LocalDate observedThrough,String timezone,long xp,long counted,long legacyExcluded,List<Source> sources){}
 @GetMapping public Summary get(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate week,HttpServletRequest request){
  var user=current.requireUser(request);if(!available)throw new IllegalStateException("Bạn đồng hành đang tạm tắt.");var today=time.today(user);var currentWeek=today.with(java.time.DayOfWeek.MONDAY);var selected=week==null?currentWeek:week;
  if(selected.getDayOfWeek()!=DayOfWeek.MONDAY||selected.isAfter(currentWeek)||selected.isBefore(currentWeek.minusWeeks(51)))throw new IllegalArgumentException("Invalid companion week");
  var end=selected.plusDays(6).isAfter(today)?today:selected.plusDays(6);List<Source> sources=new ArrayList<>();long xp=0,legacy=0;
  for(var row:checkIns.findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(),selected,end)){
   if(row.getStatus()!=CheckInStatus.COMPLETED)continue;
   if(row.getPointsSnapshot()==null||row.getAppliedXp()==null){legacy++;continue;}
   if(row.getPointsSnapshot()<=0)continue;
   sources.add(new Source(row.getId(),row.getHabit().getId(),row.getHabit().getName(),row.getDate(),row.getPointsSnapshot()));xp+=row.getPointsSnapshot();
  }
  return new Summary(selected,end,time.zone(user).getId(),xp,sources.size(),legacy,sources);
 }
}
