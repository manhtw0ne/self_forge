package com.selfforge.discipline.checkin;
import com.selfforge.discipline.auth.*;import com.selfforge.discipline.companion.*;import com.selfforge.discipline.reward.UserLevelRepository;
import jakarta.persistence.*;import jakarta.servlet.http.HttpServletRequest;import jakarta.validation.Valid;import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;import org.springframework.http.HttpStatus;import org.springframework.transaction.annotation.Transactional;import org.springframework.web.bind.annotation.*;import org.springframework.web.server.ResponseStatusException;import java.time.LocalDate;import java.util.Objects;
@RestController @RequestMapping("/api/check-ins/preview") @Transactional
public class CheckInPreviewController {
 private final CurrentUserService current;private final AppUserRepository users;private final DailyCheckInRepository checkIns;private final UserLevelRepository levels;private final CompanionPreferenceRepository companions;private final CompanionProgressRepository progress;private final boolean companionEnabled;
 @PersistenceContext private EntityManager manager;
 public CheckInPreviewController(CurrentUserService current,AppUserRepository users,DailyCheckInRepository checkIns,UserLevelRepository levels,CompanionPreferenceRepository companions,CompanionProgressRepository progress,@Value("${app.companion.enabled:true}") boolean companionEnabled){this.current=current;this.users=users;this.checkIns=checkIns;this.levels=levels;this.companions=companions;this.progress=progress;this.companionEnabled=companionEnabled;}
 public record Request(@NotNull @Positive Long habitId,@NotNull LocalDate date,@NotNull CheckInStatus status,@NotNull @Valid CheckInRequests.CheckInSnapshot expected){}
 public record Response(Long checkInId,CheckInStatus fromStatus,CheckInStatus toStatus,boolean allowed,String reason,Long accountDelta,Long companionDelta,Long companionXpBefore,Long companionXpAfter,Integer stageBefore,Integer stageAfter,int companionProgressionVersion){}
 @PostMapping public Response preview(@Valid @RequestBody Request body,HttpServletRequest request){
  var user=users.lockById(current.requireUser(request).getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));manager.refresh(user);current.requireUser(request);
  var entry=checkIns.findByHabit_User_IdAndHabitIdAndDate(user.getId(),body.habitId(),body.date()).orElseThrow(()->new EntityNotFoundException("Check-in not found"));
  var expected=body.expected();if(!Objects.equals(entry.getId(),expected.id())||entry.getStatus()!=expected.status()||!Objects.equals(entry.getNote()==null?"":entry.getNote(),expected.note()==null?"":expected.note()))throw new IllegalStateException("Check-in trên máy chủ đã thay đổi. Tải lại trước khi xem tác động.");
  boolean changed=entry.getStatus()!=body.status();
  if(changed&&(entry.getAppliedXp()==null||entry.getPointsSnapshot()==null||entry.getFailurePointsSnapshot()==null))return new Response(entry.getId(),entry.getStatus(),body.status(),false,"LEGACY",null,null,null,null,null,null,CompanionProgression.VERSION);
  long accountDelta=0;
  if(changed){
   long balance=levels.findByUserId(user.getId()).map(level->(long)level.getTotalXp()).orElse(0L);long prior=entry.getAppliedXp();
   if(prior>0&&balance<prior)return new Response(entry.getId(),entry.getStatus(),body.status(),false,"INSUFFICIENT_XP",null,null,null,null,null,null,CompanionProgression.VERSION);
   long restored=balance-prior;long desired=switch(body.status()){case COMPLETED->entry.getPointsSnapshot();case FAILED->-entry.getFailurePointsSnapshot();case SKIPPED->0;};
   long effect=desired>=0?desired:-Math.min(restored,-desired);accountDelta=effect-prior;
  }
  Long companionDelta=null,before=null,after=null;Integer stageBefore=null,stageAfter=null;
  if(companionEnabled&&companions.findById(user.getId()).map(row->row.isVisible()).orElse(false)){
   before=progress.totals(user.getId()).getXp();long points=entry.getPointsSnapshot()!=null&&entry.getAppliedXp()!=null?Math.max(0,entry.getPointsSnapshot()):0;
   companionDelta=(body.status()==CheckInStatus.COMPLETED?points:0)-(entry.getStatus()==CheckInStatus.COMPLETED?points:0);after=Math.max(0,before+companionDelta);stageBefore=CompanionProgression.stageFor(before);stageAfter=CompanionProgression.stageFor(after);
  }
  return new Response(entry.getId(),entry.getStatus(),body.status(),true,"READY",accountDelta,companionDelta,before,after,stageBefore,stageAfter,CompanionProgression.VERSION);
 }
}
