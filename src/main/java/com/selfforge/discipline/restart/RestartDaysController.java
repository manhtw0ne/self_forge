package com.selfforge.discipline.restart;
import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.common.UserTime;
import jakarta.persistence.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
@RestController @RequestMapping("/api/restart-plan/days") @Transactional
public class RestartDaysController {
 private final CurrentUserService current;private final AppUserRepository users;private final RestartPlanRepository plans;private final RestartDaysRepository days;private final UserTime time;
 @PersistenceContext private EntityManager manager;
 public RestartDaysController(CurrentUserService current,AppUserRepository users,RestartPlanRepository plans,RestartDaysRepository days,UserTime time){this.current=current;this.users=users;this.plans=plans;this.days=days;this.time=time;}
 public record Request(@NotNull @Min(1) Long planVersion,@NotNull @Min(0) Long expectedVersion,@NotNull @Min(1) @Max(3) Integer day,@NotNull Boolean tried){}
 public record Response(long planVersion,long version,List<Boolean> tried){}
 private Response response(RestartDays row){return new Response(row.planVersion,row.revision,List.of(row.dayOne,row.dayTwo,row.dayThree));}
 private RestartPlan plan(Long id,long version){var plan=plans.findById(id).orElseThrow(()->new EntityNotFoundException("Restart plan not found"));if(plan.revision!=version)throw new ResponseStatusException(HttpStatus.CONFLICT,"Kế hoạch đã thay đổi. Tải lại trước khi ghi nhận ngày đã thử.");return plan;}
 @GetMapping public Response get(@RequestParam long planVersion,HttpServletRequest request){
  var id=current.requireUser(request).getId();var plan=plan(id,planVersion);
  return response(days.findById(id).filter(row->row.planVersion==plan.revision).orElseGet(()->new RestartDays(id,plan.revision)));
 }
 @PutMapping public Response save(@Valid @RequestBody Request body,HttpServletRequest request){
  var user=users.lockById(current.requireUser(request).getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));manager.refresh(user);current.requireUser(request);
  var plan=plan(user.getId(),body.planVersion());
  if(plan.startDate.plusDays(body.day()-1).isAfter(time.today(user)))throw new IllegalArgumentException("Chỉ ghi nhận ngày đã đến theo múi giờ tài khoản.");
  var row=days.findById(user.getId()).filter(value->value.planVersion==plan.revision).orElseGet(()->new RestartDays(user.getId(),plan.revision));
  if(row.revision>0&&row.tried(body.day())==body.tried()&&(body.expectedVersion()==row.revision||body.expectedVersion()==row.revision-1))return response(row);
  if(body.expectedVersion()!=row.revision)throw new ResponseStatusException(HttpStatus.CONFLICT,"Ghi nhận đã thay đổi. Xem bản đã lưu trước khi sửa tiếp.");
  row.setTried(body.day(),body.tried());row.revision++;
  return response(days.save(row));
 }
}
