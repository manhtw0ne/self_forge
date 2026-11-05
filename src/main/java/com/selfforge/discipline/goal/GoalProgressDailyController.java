package com.selfforge.discipline.goal;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.common.UserTime;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;
@RestController @RequestMapping("/api/goals/{goalId}") @Transactional(readOnly=true)
public class GoalProgressDailyController {
 private final CurrentUserService current;private final GoalRepository goals;private final GoalProgressCorrectionRepository history;private final UserTime time;
 public GoalProgressDailyController(CurrentUserService current,GoalRepository goals,GoalProgressCorrectionRepository history,UserTime time){this.current=current;this.goals=goals;this.history=history;this.time=time;}
 public record Activity(LocalDate date,String unit,long additions,long corrections,long added,long increased,long decreased){}
 public record Response(Long goalId,LocalDate fromDate,LocalDate toDate,String timezone,List<Activity> items){}
 @GetMapping("/progress-daily") public Response get(@PathVariable Long goalId,@RequestParam(defaultValue="30")int days,HttpServletRequest request){
  var user=current.requireUser(request);if(!List.of(7,30,90).contains(days))throw new IllegalArgumentException("Khoảng ngày không hợp lệ.");
  goals.findByIdAndUserId(goalId,user.getId()).orElseThrow(()->new EntityNotFoundException("Goal not found"));
  var end=time.today(user);var start=end.minusDays(days-1);var zone=time.zone(user);
  record Key(LocalDate date,String unit){}
  var groups=new LinkedHashMap<Key,long[]>();
  for(var row:history.dailyRange(user.getId(),goalId,time.day(user,start).start(),time.day(user,end).end())){
   var key=new Key(row.getCreatedAt().atZone(zone).toLocalDate(),row.getUnit());var values=groups.computeIfAbsent(key,k->new long[5]);long delta=(long)row.getToValue()-row.getFromValue();
   if("ADD".equals(row.getKind())){values[0]++;values[2]+=delta;}else{values[1]++;values[3]+=Math.max(0,delta);values[4]+=Math.max(0,-delta);}
  }
  return new Response(goalId,start,end,zone.getId(),groups.entrySet().stream().map(e->{var v=e.getValue();return new Activity(e.getKey().date(),e.getKey().unit(),v[0],v[1],v[2],v[3],v[4]);}).toList());
 }

 public record DayResponse(Long goalId,LocalDate date,String timezone,List<GoalProgressHistoryController.Entry> items,Long nextCursor){}
 @GetMapping("/progress-day") public DayResponse day(@PathVariable Long goalId,@RequestParam LocalDate date,@RequestParam(required=false)Long beforeId,HttpServletRequest request){
  var user=current.requireUser(request);
  if(date.getYear()<1||date.isAfter(time.today(user))||beforeId!=null&&beforeId<=0)throw new IllegalArgumentException("Ngày hoặc mã phân trang không hợp lệ.");
  goals.findByIdAndUserId(goalId,user.getId()).orElseThrow(()->new EntityNotFoundException("Goal not found"));
  var window=time.day(user,date);var rows=history.dayHistory(user.getId(),goalId,window.start(),window.end(),beforeId==null?Long.MAX_VALUE:beforeId,org.springframework.data.domain.PageRequest.of(0,21));
  var items=rows.stream().limit(20).map(row->new GoalProgressHistoryController.Entry(row.getId(),row.getFromValue(),row.getToValue(),row.getTargetValue(),row.getUnit(),row.getFromStatus(),row.getToStatus(),row.getCreatedAt(),row.getKind())).toList();
  return new DayResponse(goalId,date,time.zone(user).getId(),items,rows.size()>20?items.getLast().id():null);
 }
}
