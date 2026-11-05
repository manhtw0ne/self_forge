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
@RestController @RequestMapping("/api/restart-plan/review") @Transactional
public class RestartReviewController {
 private final CurrentUserService current;private final AppUserRepository users;private final RestartPlanRepository plans;private final RestartReviewRepository reviews;private final UserTime time;
 @PersistenceContext private EntityManager manager;
 public RestartReviewController(CurrentUserService current,AppUserRepository users,RestartPlanRepository plans,RestartReviewRepository reviews,UserTime time){this.current=current;this.users=users;this.plans=plans;this.reviews=reviews;this.time=time;}
 public record Request(@NotNull @Min(1) Long planVersion,@NotNull @Min(0) Long expectedVersion,@NotNull @Min(0) @Max(3) Integer daysTried,
   @NotNull @Pattern(regexp="KEEP|EASIER|HARDER|PAUSE") String decision,@NotNull @Size(max=500) String note){}
 public record Response(long planVersion,long version,int daysTried,String decision,String note){}
 private Response response(RestartReview row){return new Response(row.planVersion,row.revision,row.daysTried,row.decision,row.note);}
 @GetMapping public Response get(HttpServletRequest request){
  var id=current.requireUser(request).getId();var plan=plans.findById(id);
  if(plan.isEmpty())return null;
  return reviews.findById(id).filter(row->row.planVersion==plan.get().revision).map(this::response).orElse(null);
 }
 @PutMapping public Response save(@Valid @RequestBody Request body,HttpServletRequest request){
  var id=current.requireUser(request).getId();var user=users.lockById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  manager.refresh(user);current.requireUser(request);
  var plan=plans.findById(id).orElseThrow(()->new EntityNotFoundException("Restart plan not found"));
  if(body.planVersion()!=plan.revision)throw new ResponseStatusException(HttpStatus.CONFLICT,"Kế hoạch đã thay đổi. Tải lại kế hoạch trước khi đánh giá.");
  if(!time.today(user).isAfter(plan.startDate.plusDays(2)))throw new IllegalArgumentException("Chỉ đánh giá sau khi khoảng 3 ngày đã kết thúc.");
  var row=reviews.findById(id).filter(value->value.planVersion==plan.revision).orElseGet(()->new RestartReview(id));
  boolean same=row.revision>0&&row.daysTried==body.daysTried()&&body.decision().equals(row.decision)&&body.note().equals(row.note);
  if(same&&(body.expectedVersion()==row.revision||body.expectedVersion()==row.revision-1))return response(row);
  if(body.expectedVersion()!=row.revision)throw new ResponseStatusException(HttpStatus.CONFLICT,"Đánh giá đã thay đổi. Xem bản đã lưu trước khi sửa tiếp.");
  row.planVersion=plan.revision;row.revision++;row.daysTried=body.daysTried();row.decision=body.decision();row.note=body.note();
  return response(reviews.save(row));
 }
}
