package com.selfforge.discipline.checkin;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.common.UserTime;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;import java.util.*;
@RestController @RequestMapping("/api/check-ins/history") @Transactional(readOnly=true)
public class CheckInHistoryController {
 private final CurrentUserService users;private final DailyCheckInRepository entries;private final UserTime time;
 public CheckInHistoryController(CurrentUserService users,DailyCheckInRepository entries,UserTime time){this.users=users;this.entries=entries;this.time=time;}
 public record Cursor(LocalDate date,Long id){}
 public record Response(String query,String status,LocalDate fromDate,LocalDate toDate,String timezone,List<CheckInResponse> items,Cursor nextCursor){}
 @GetMapping public Response get(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="ALL") String status,
  @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fromDate,
  @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate toDate,
  @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate beforeDate,@RequestParam(required=false) Long beforeId,HttpServletRequest request){
  var user=users.requireUser(request);var today=time.today(user);var from=fromDate==null?today.minusDays(29):fromDate;var to=toDate==null?today:toDate;String query=q.trim();
  if(query.length()>100||from.isBefore(LocalDate.of(1,1,1))||from.isAfter(to)||to.isAfter(today)||java.time.temporal.ChronoUnit.DAYS.between(from,to)>365)throw new IllegalArgumentException("Invalid check-in history range");
  List<CheckInStatus> statuses;if(status.equals("ALL"))statuses=Arrays.asList(CheckInStatus.values());else{try{statuses=List.of(CheckInStatus.valueOf(status));}catch(IllegalArgumentException e){throw new IllegalArgumentException("Invalid check-in status");}}
  if((beforeDate==null)!=(beforeId==null)||beforeId!=null&&(beforeId<=0||beforeDate.isBefore(from)||beforeDate.isAfter(to)))throw new IllegalArgumentException("Invalid check-in cursor");
  var rows=entries.searchHistory(user.getId(),from,to,statuses,query,beforeDate==null?to:beforeDate,beforeId==null?Long.MAX_VALUE:beforeId,org.springframework.data.domain.PageRequest.of(0,21));
  var page=rows.stream().limit(20).toList();var last=page.isEmpty()?null:page.getLast();
  return new Response(query,status,from,to,time.zone(user).getId(),page.stream().map(CheckInResponse::from).toList(),rows.size()>20?new Cursor(last.getDate(),last.getId()):null);
 }

 @GetMapping("/export") public Response export(@RequestParam(defaultValue="")String q,@RequestParam(defaultValue="ALL")String status,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate fromDate,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate toDate,HttpServletRequest request){
  var scope=get(q,status,fromDate,toDate,null,null,request);var user=users.requireUser(request);
  var statuses=status.equals("ALL")?Arrays.asList(CheckInStatus.values()):List.of(CheckInStatus.valueOf(status));
  var rows=entries.searchHistory(user.getId(),scope.fromDate(),scope.toDate(),statuses,scope.query(),scope.toDate(),Long.MAX_VALUE,org.springframework.data.domain.PageRequest.of(0,10001));
  if(rows.size()>10000)throw new IllegalArgumentException("Quá 10.000 check-in. Thu hẹp khoảng ngày hoặc bộ lọc trước khi xuất.");
  return new Response(scope.query(),scope.status(),scope.fromDate(),scope.toDate(),scope.timezone(),rows.stream().map(CheckInResponse::from).toList(),null);
 }
}
