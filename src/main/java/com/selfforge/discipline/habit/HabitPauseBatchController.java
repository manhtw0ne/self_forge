package com.selfforge.discipline.habit;
import com.selfforge.discipline.auth.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@RestController @RequestMapping("/api/habits") @Transactional
public class HabitPauseBatchController {
 private final CurrentUserService current;private final AppUserRepository users;private final HabitService habits;private final HabitRepository repository;
 public HabitPauseBatchController(CurrentUserService current,AppUserRepository users,HabitService habits,HabitRepository repository){this.current=current;this.users=users;this.habits=habits;this.repository=repository;}
 public record Item(@NotNull @Positive Long habitId,@NotBlank @Size(max=255)String name,@NotNull Difficulty difficulty,@Min(1) @Max(7)int targetPerWeek){}
 public record Request(@NotNull @Size(min=1,max=20)List<@NotNull @Valid Item> items){}
 @PatchMapping("/pause-batch") public List<HabitResponse> pause(@Valid @RequestBody Request body,HttpServletRequest request){return apply(body,request,false);}
 @PatchMapping("/activate-batch") public List<HabitResponse> activate(@Valid @RequestBody Request body,HttpServletRequest request){return apply(body,request,true);}
 private List<HabitResponse> apply(Request body,HttpServletRequest request,boolean active){var user=current.requireUser(request);user=users.lockById(user.getId()).orElseThrow();var ids=new HashSet<Long>();var rows=new ArrayList<Habit>();
  for(var item:body.items()){if(!ids.add(item.habitId()))throw new IllegalArgumentException("Thói quen bị lặp trong nhóm.");rows.add(habits.getHabit(user,item.habitId()));}
  if(rows.stream().allMatch(row->row.isActive()==active))return rows.stream().map(HabitResponse::from).toList();
  for(int i=0;i<rows.size();i++){var row=rows.get(i);var expected=body.items().get(i);if(row.isActive()==active||!Objects.equals(row.getName(),expected.name())||row.getDifficulty()!=expected.difficulty()||row.getTargetPerWeek()!=expected.targetPerWeek())throw new IllegalStateException("Một thói quen đã thay đổi. Chưa áp dụng thay đổi nào trong nhóm; tải lại và xem trước khi tiếp tục.");}
  if(active&&!user.isPremium()&&repository.countByUserIdAndActiveTrue(user.getId())+rows.size()>PremiumController.FREE_MAX_HABITS)throw new IllegalStateException("Không đủ chỗ để bật lại cả nhóm. Tắt bớt thói quen hoặc chọn nhóm nhỏ hơn; chưa bật lại thói quen nào.");
  for(var row:rows)habits.update(user,row.getId(),new HabitRequests.UpdateHabitRequest(null,null,null,null,null,active,null,null,null));return rows.stream().map(HabitResponse::from).toList();
 }
}
