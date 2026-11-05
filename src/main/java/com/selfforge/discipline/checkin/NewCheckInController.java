package com.selfforge.discipline.checkin;
import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.HabitService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
@RestController @RequestMapping("/api/check-ins/new") @Transactional
public class NewCheckInController {
 private final CurrentUserService current;private final AppUserRepository users;private final HabitService habits;private final DailyCheckInRepository entries;private final CheckInService checkIns;private final UserTime time;
 public NewCheckInController(CurrentUserService current,AppUserRepository users,HabitService habits,DailyCheckInRepository entries,CheckInService checkIns,UserTime time){this.current=current;this.users=users;this.habits=habits;this.entries=entries;this.checkIns=checkIns;this.time=time;}
 public record Request(@NotNull @Positive Long habitId,@NotNull LocalDate date,@NotNull CheckInStatus status,@NotNull @Size(max=255) String note){}
 @PostMapping @ResponseStatus(org.springframework.http.HttpStatus.CREATED) public CheckInResponse create(@Valid @RequestBody Request body,HttpServletRequest request){
  var user=current.requireUser(request);users.lockById(user.getId()).orElseThrow();
  if(!body.date().equals(time.today(user)))throw new IllegalArgumentException("Luồng ghi nhận mới chỉ dành cho hôm nay. Mở lịch sử để xem hoặc sửa ngày khác.");
  var habit=habits.getHabit(user,body.habitId());if(!habit.isActive())throw new IllegalStateException("Thói quen đã tắt. Tải lại trước khi ghi nhận.");
  var existing=entries.findByHabit_User_IdAndHabitIdAndDate(user.getId(),body.habitId(),body.date()).orElse(null);
  if(existing!=null){if(existing.getStatus()==body.status()&&java.util.Objects.equals(existing.getNote()==null?"":existing.getNote(),body.note()))return CheckInResponse.from(existing);throw new IllegalStateException("Ngày này đã có check-in khác. Ghi chú đang nhập được giữ; xem bản đã lưu trước khi chỉnh sửa.");}
  return checkIns.upsert(user,new CheckInRequests.UpsertCheckInRequest(body.habitId(),body.date(),body.status(),body.note()));
 }
}
