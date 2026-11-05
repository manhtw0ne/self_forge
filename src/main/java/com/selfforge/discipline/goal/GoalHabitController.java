package com.selfforge.discipline.goal;
import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.habit.*;
import jakarta.persistence.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController
@RequestMapping("/api/goals/{goalId}/habits")
@Transactional
public class GoalHabitController {
 private final CurrentUserService current;
 private final AppUserRepository users;
 private final GoalRepository goals;
 private final HabitService habits;
 private final GoalHabitPlanRepository plans;
 private final HabitBatchReceiptRepository receipts;
 @PersistenceContext private EntityManager manager;
 public GoalHabitController(CurrentUserService current,AppUserRepository users,GoalRepository goals,HabitService habits,
    GoalHabitPlanRepository plans,HabitBatchReceiptRepository receipts){
  this.current=current;this.users=users;this.goals=goals;this.habits=habits;this.plans=plans;this.receipts=receipts;
 }
 public record Request(@NotNull @Valid HabitRequests.CreateHabitRequest habit,@NotNull UUID requestId,@NotNull @Valid GoalController.GoalSnapshot expected){}
 public record LinkRequest(@NotNull @Positive Long habitId,@NotNull UUID requestId,@NotNull @Valid GoalController.GoalSnapshot expected){}
 @GetMapping public List<HabitResponse> list(@PathVariable Long goalId,HttpServletRequest request){
  var user=current.requireUser(request);
  goals.findByIdAndUserId(goalId,user.getId()).orElseThrow(()->new EntityNotFoundException("Goal not found"));
  return plans.findByUserIdAndGoalIdOrderByIdAsc(user.getId(),goalId).stream()
    .map(plan->HabitResponse.from(habits.getHabit(user,plan.getHabitId()))).distinct().toList();
 }
 @PostMapping @ResponseStatus(HttpStatus.CREATED)
 public HabitResponse create(@PathVariable Long goalId,@Valid @RequestBody Request body,HttpServletRequest request){
  var user=users.lockById(current.requireUser(request).getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  manager.refresh(user);current.requireUser(request);
  var goal=goals.findByIdAndUserId(goalId,user.getId()).orElseThrow(()->new EntityNotFoundException("Goal not found"));
  var key=body.requestId().toString();var prior=plans.findByUserIdAndRequestId(user.getId(),key);
  if(prior.isPresent()){
   if(!prior.get().getGoalId().equals(goalId))throw new IllegalStateException("Mã yêu cầu đã dùng cho mục tiêu khác.");
   if(receipts.findByUserIdAndRequestId(user.getId(),key).isEmpty())throw new IllegalStateException("Mã yêu cầu đã dùng để gắn thói quen.");
   return habits.createBatch(user,List.of(body.habit()),body.requestId()).getFirst();
  }
  if(receipts.findByUserIdAndRequestId(user.getId(),key).isPresent())throw new IllegalStateException("Mã yêu cầu đã dùng để tạo thói quen khác.");
  GoalController.requireSnapshot(goal,body.expected(),"Mục tiêu đã thay đổi. Xem bản mới trước khi tạo thói quen.");
  if(goal.getStatus()!=GoalStatus.ACTIVE)throw new IllegalStateException("Chỉ tạo thói quen cho mục tiêu đang thực hiện.");
  var result=habits.createBatch(user,List.of(body.habit()),body.requestId()).getFirst();
  plans.save(new GoalHabitPlan(user.getId(),goalId,result.id(),key));
  return result;
 }
 @PostMapping("/link")
 public HabitResponse link(@PathVariable Long goalId,@Valid @RequestBody LinkRequest body,HttpServletRequest request){
  var user=users.lockById(current.requireUser(request).getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  manager.refresh(user);current.requireUser(request);
  var goal=goals.findByIdAndUserId(goalId,user.getId()).orElseThrow(()->new EntityNotFoundException("Goal not found"));
  var habit=habits.getHabit(user,body.habitId());
  var key=body.requestId().toString();var prior=plans.findByUserIdAndRequestId(user.getId(),key);
  if(prior.isPresent()){
   if(!prior.get().getGoalId().equals(goalId)||!prior.get().getHabitId().equals(body.habitId())||receipts.findByUserIdAndRequestId(user.getId(),key).isPresent())
    throw new IllegalStateException("Mã yêu cầu đã dùng cho thao tác khác.");
   return HabitResponse.from(habit);
  }
  if(receipts.findByUserIdAndRequestId(user.getId(),key).isPresent())throw new IllegalStateException("Mã yêu cầu đã dùng để tạo thói quen.");
  if(!plans.existsByUserIdAndGoalIdAndHabitId(user.getId(),goalId,body.habitId())){
   GoalController.requireSnapshot(goal,body.expected(),"Mục tiêu đã thay đổi. Xem bản mới trước khi gắn thói quen.");
   if(goal.getStatus()!=GoalStatus.ACTIVE)throw new IllegalStateException("Chỉ gắn thói quen cho mục tiêu đang thực hiện.");
   if(!habit.isActive())throw new IllegalStateException("Chỉ gắn thói quen đang hoạt động.");
  }
  plans.save(new GoalHabitPlan(user.getId(),goalId,body.habitId(),key));
  return HabitResponse.from(habit);
 }
}
