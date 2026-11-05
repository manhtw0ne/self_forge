package com.selfforge.discipline.weekplan;
import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.common.UserTime;
import jakarta.persistence.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;import org.springframework.web.bind.annotation.*;import org.springframework.web.server.ResponseStatusException;
import java.time.*;import java.time.temporal.TemporalAdjusters;
@RestController @RequestMapping("/api/week-plans") @Transactional
public class WeekActionPlanController {
 private final CurrentUserService current;private final AppUserRepository users;private final WeekActionPlanRepository plans;private final UserTime time;
 @PersistenceContext private EntityManager manager;
 public WeekActionPlanController(CurrentUserService current,AppUserRepository users,WeekActionPlanRepository plans,UserTime time){this.current=current;this.users=users;this.plans=plans;this.time=time;}
 public record Request(@NotBlank @Size(max=1000) String action,@NotNull LocalDate date,@NotNull @Pattern(regexp="^$|([01][0-9]|2[0-3]):[0-5][0-9]") String time,@NotNull @Min(0) Long expectedVersion){}
 public record Completion(@NotNull Boolean completed,@NotNull @Min(1) Long expectedVersion){}
 public record Response(LocalDate week,String action,LocalDate date,String time,boolean completed,long version){}
 private Response response(WeekActionPlan row){return new Response(row.weekStart,row.action,row.actionDate,row.actionTime,row.completed,row.revision);}
 private void validateWeek(AppUser user,LocalDate week){
  LocalDate today=time.today(user);
  if(week.getYear()<1||week.getYear()>9998||week.getDayOfWeek()!=DayOfWeek.MONDAY||week.isBefore(today.minusYears(1))||week.isAfter(today.plusWeeks(2)))throw new IllegalArgumentException("Chọn tuần từ một năm qua đến hai tuần tới, bắt đầu vào thứ Hai.");
 }
 private AppUser lock(HttpServletRequest request){var user=users.lockById(current.requireUser(request).getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));manager.refresh(user);current.requireUser(request);return user;}
 @GetMapping public Response get(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate week,HttpServletRequest request){var user=current.requireUser(request);validateWeek(user,week);return plans.findByUserIdAndWeekStart(user.getId(),week).map(this::response).orElse(null);}
 @GetMapping("/current") public Response currentWeek(HttpServletRequest request){var user=current.requireUser(request);var week=time.today(user).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));return plans.findByUserIdAndWeekStart(user.getId(),week).map(this::response).orElse(null);}
 @PutMapping("/{week}") public Response save(@PathVariable @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate week,@Valid @RequestBody Request body,HttpServletRequest request){
  var user=lock(request);validateWeek(user,week);
  if(body.date().isBefore(week)||body.date().isAfter(week.plusDays(6)))throw new IllegalArgumentException("Ngày thực hiện phải nằm trong tuần đã chọn.");
  var row=plans.findByUserIdAndWeekStart(user.getId(),week).orElseGet(()->new WeekActionPlan(user.getId(),week));
  boolean same=body.action().equals(row.action)&&body.date().equals(row.actionDate)&&body.time().equals(row.actionTime);
  if(same&&(body.expectedVersion()==row.revision||body.expectedVersion()==row.revision-1))return response(row);
  if(body.expectedVersion()!=row.revision)throw new ResponseStatusException(HttpStatus.CONFLICT,"Kế hoạch tuần đã thay đổi. Xem bản đã lưu trước khi sửa tiếp.");
  row.action=body.action();row.actionDate=body.date();row.actionTime=body.time();row.completed=false;row.revision++;
  return response(plans.save(row));
 }
 @PatchMapping("/{week}/completion") public Response completion(@PathVariable @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate week,@Valid @RequestBody Completion body,HttpServletRequest request){
  var user=lock(request);validateWeek(user,week);var row=plans.findByUserIdAndWeekStart(user.getId(),week).orElseThrow(()->new EntityNotFoundException("Week plan not found"));
  if(body.completed()&&row.actionDate.isAfter(time.today(user)))throw new IllegalStateException("Chưa đến ngày thực hiện bước trong kế hoạch.");
  if(body.completed()==row.completed&&(body.expectedVersion()==row.revision||body.expectedVersion()==row.revision-1))return response(row);
  if(body.expectedVersion()!=row.revision)throw new ResponseStatusException(HttpStatus.CONFLICT,"Kế hoạch tuần đã thay đổi. Tải lại trước khi ghi nhận.");
  row.completed=body.completed();row.revision++;return response(row);
 }
}
