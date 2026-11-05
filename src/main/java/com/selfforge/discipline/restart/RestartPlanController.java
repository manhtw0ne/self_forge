package com.selfforge.discipline.restart;
import com.selfforge.discipline.auth.*;
import jakarta.persistence.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;
@RestController
@RequestMapping("/api/restart-plan")
@Transactional
public class RestartPlanController {
 private final CurrentUserService current;private final AppUserRepository users;private final RestartPlanRepository plans;private final RestartArchiveService archives;
 @PersistenceContext private EntityManager manager;
 public RestartPlanController(CurrentUserService current,AppUserRepository users,RestartPlanRepository plans,RestartArchiveService archives){this.current=current;this.users=users;this.plans=plans;this.archives=archives;}
 public record Request(@NotBlank @Size(max=255) String name,@NotNull @Pattern(regexp="BUSY|HARD|FORGOT|REST") String reason,
 @NotNull LocalDate start,@NotNull @Size(min=3,max=3) List<@NotBlank @Size(max=500) String> steps,@NotNull @Min(0) Long expectedVersion){}
 public record Response(String name,String reason,LocalDate start,List<String> steps,long version){}
 private Response response(RestartPlan plan){return new Response(plan.name,plan.reason,plan.startDate,List.of(plan.stepOne,plan.stepTwo,plan.stepThree),plan.revision);}
 @GetMapping public Response get(HttpServletRequest request){return plans.findById(current.requireUser(request).getId()).map(this::response).orElse(null);}
 @PutMapping public Response save(@Valid @RequestBody Request body,HttpServletRequest request){
  Long id=current.requireUser(request).getId();var user=users.lockById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  manager.refresh(user);current.requireUser(request);
  if(body.start().isBefore(LocalDate.of(1,1,1))||body.start().isAfter(LocalDate.of(9999,12,29)))throw new IllegalArgumentException("Ngày bắt đầu không hợp lệ.");
  var plan=plans.findById(id).orElseGet(()->new RestartPlan(id));
  boolean same=body.name().equals(plan.name)&&body.reason().equals(plan.reason)&&body.start().equals(plan.startDate)&&
    body.steps().equals(java.util.Arrays.asList(plan.stepOne,plan.stepTwo,plan.stepThree));
  if(same && (body.expectedVersion()==plan.revision || body.expectedVersion()==plan.revision-1))return response(plan);
  if(body.expectedVersion()!=plan.revision)throw new ResponseStatusException(HttpStatus.CONFLICT,"Kế hoạch đã thay đổi. Xem bản trên máy chủ trước khi lưu tiếp.");
  archives.archive(plan);
  plan.name=body.name();plan.reason=body.reason();plan.startDate=body.start();plan.stepOne=body.steps().get(0);plan.stepTwo=body.steps().get(1);plan.stepThree=body.steps().get(2);plan.revision++;
  return response(plans.save(plan));
 }
}
