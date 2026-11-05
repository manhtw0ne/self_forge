package com.selfforge.discipline.stats;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.checkin.*;
import com.selfforge.discipline.common.UserTime;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@RestController @RequestMapping("/api/stats/categories") @Transactional(readOnly=true)
public class CategoryActivityController {
 private final CurrentUserService users;private final DailyCheckInRepository checkIns;private final UserTime time;
 public CategoryActivityController(CurrentUserService users,DailyCheckInRepository checkIns,UserTime time){this.users=users;this.checkIns=checkIns;this.time=time;}
 public record Row(Long categoryId,String name,boolean systemDefault,long habits,long completed,long failed,long skipped,long checkIns){}
 public record Summary(String month,LocalDate observedThrough,String timezone,long completed,long failed,long skipped,long checkIns,List<Row> categories){}
 private static final class Group {
  Long id;String name;boolean systemDefault;Set<Long> habits=new HashSet<>();long completed,failed,skipped;
  Group(Long id,String name,boolean systemDefault){this.id=id;this.name=name;this.systemDefault=systemDefault;}
  Row row(){return new Row(id,name,systemDefault,habits.size(),completed,failed,skipped,completed+failed+skipped);}
 }
 @GetMapping public Summary get(@RequestParam(required=false) @DateTimeFormat(pattern="yyyy-MM") YearMonth month,HttpServletRequest request){
  var user=users.requireUser(request);var today=time.today(user);var current=YearMonth.from(today);var selected=month==null?current:month;
  if(selected.isAfter(current)||selected.isBefore(current.minusMonths(23)))throw new IllegalArgumentException("Invalid category activity month");
  var through=selected.atEndOfMonth().isAfter(today)?today:selected.atEndOfMonth();Map<Long,Group> groups=new LinkedHashMap<>();
  for(var checkIn:checkIns.categoryActivity(user.getId(),selected.atDay(1),through)){
   var habit=checkIn.getHabit();var category=habit.getCategory();
   if(category!=null&&!category.isSystemDefault()&&!category.getUser().getId().equals(user.getId()))category=null;
   Long id=category==null?null:category.getId();var group=groups.get(id);
   if(group==null){group=new Group(id,category==null?"":category.getName(),category!=null&&category.isSystemDefault());groups.put(id,group);}
   group.habits.add(habit.getId());switch(checkIn.getStatus()){case COMPLETED->group.completed++;case FAILED->group.failed++;case SKIPPED->group.skipped++;}
  }
  var rows=groups.values().stream().map(Group::row).sorted(Comparator.comparingLong(Row::completed).reversed().thenComparing(Row::name,String.CASE_INSENSITIVE_ORDER).thenComparing(row->row.categoryId()==null?Long.MAX_VALUE:row.categoryId())).toList();
  long completed=0,failed=0,skipped=0;for(var row:rows){completed+=row.completed();failed+=row.failed();skipped+=row.skipped();}
  return new Summary(selected.toString(),through,time.zone(user).getId(),completed,failed,skipped,completed+failed+skipped,rows);
 }
}
