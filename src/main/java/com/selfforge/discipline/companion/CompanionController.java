package com.selfforge.discipline.companion;
import com.selfforge.discipline.auth.*;
import jakarta.persistence.*;import jakarta.servlet.http.HttpServletRequest;import jakarta.validation.Valid;import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;import org.springframework.http.HttpStatus;import org.springframework.transaction.annotation.Transactional;import org.springframework.web.bind.annotation.*;import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
@RestController @RequestMapping("/api/companion") @Transactional
public class CompanionController {
 private final CurrentUserService current;private final AppUserRepository users;private final CompanionPreferenceRepository preferences;private final CompanionProgressRepository progress;private final CompanionMilestoneAckRepository acknowledgements;private final boolean available;
 @PersistenceContext private EntityManager manager;
 public CompanionController(CurrentUserService current,AppUserRepository users,CompanionPreferenceRepository preferences,CompanionProgressRepository progress,CompanionMilestoneAckRepository acknowledgements,@Value("${app.companion.enabled:true}") boolean available){this.current=current;this.users=users;this.preferences=preferences;this.progress=progress;this.acknowledgements=acknowledgements;this.available=available;}
 public record Request(@NotNull @Pattern(regexp="CHON|CHIM|KY_GIONG") String species,@NotNull @Size(max=40) String name,@NotNull Boolean visible,@NotNull @Min(0) Long expectedVersion){}
 public record Response(boolean available,String species,String name,boolean visible,long version,long xp,int stage,Long nextThreshold,long countedCheckIns,long legacyExcluded,Integer pendingMilestone,int progressionVersion){}
 private Response response(Long owner,CompanionPreference preference){
  var row=preference==null?new CompanionPreference(owner):preference;
  if(!available)return new Response(false,row.species,row.name,false,row.revision,0,1,CompanionProgression.nextThreshold(1),0,0,null,CompanionProgression.VERSION);
  var totals=progress.totals(owner);long xp=totals.getXp();int stage=CompanionProgression.stageFor(xp);
  return new Response(true,row.species,row.name,row.visible,row.revision,xp,stage,CompanionProgression.nextThreshold(stage),totals.getCounted(),totals.getLegacy(),pendingMilestone(owner,row,stage),CompanionProgression.VERSION);
 }
 @GetMapping public Response get(HttpServletRequest request){var user=current.requireUser(request);return response(user.getId(),preferences.findById(user.getId()).orElse(null));}
 @PutMapping public Response save(@Valid @RequestBody Request body,HttpServletRequest request){
  var user=users.lockById(current.requireUser(request).getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));manager.refresh(user);current.requireUser(request);
  if(!available)throw new IllegalStateException("Bạn đồng hành đang tạm tắt.");
  var row=preferences.findById(user.getId()).orElseGet(()->new CompanionPreference(user.getId()));
  boolean wasVisible=row.revision>0&&row.visible;
  String name=body.name().trim();boolean same=body.species().equals(row.species)&&name.equals(row.name)&&body.visible()==row.visible;
  if(row.revision>0&&same&&(body.expectedVersion()==row.revision||body.expectedVersion()==row.revision-1))return response(user.getId(),row);
  if(body.expectedVersion()!=row.revision)throw new ResponseStatusException(HttpStatus.CONFLICT,"Lựa chọn bạn đồng hành đã thay đổi. Xem bản mới trước khi lưu.");
  row.species=body.species();row.name=name;row.visible=body.visible();row.revision++;
  var stored=preferences.save(row);
  // Choosing to reveal an existing companion should not replay celebrations for
  // progress earned before this choice. Future milestones remain unacknowledged.
  if(stored.visible&&!wasVisible)acknowledgeThrough(user.getId(),CompanionProgression.stageFor(progress.totals(user.getId()).getXp()));
  return response(user.getId(),stored);
 }
 @PostMapping("/milestones/{stage}/ack") public Response acknowledge(@PathVariable @Min(2) @Max(3) int stage,HttpServletRequest request){
  if(stage!=2&&stage!=3)throw new IllegalArgumentException("Mốc bạn đồng hành không hợp lệ.");
  var user=users.lockById(current.requireUser(request).getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));manager.refresh(user);current.requireUser(request);
  if(!available)throw new IllegalStateException("Bạn đồng hành đang tạm tắt.");
  var row=preferences.findById(user.getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"Hãy chọn bạn đồng hành trước khi xác nhận mốc."));
  if(!row.visible)throw new ResponseStatusException(HttpStatus.CONFLICT,"Hãy hiển thị bạn đồng hành trước khi xác nhận mốc.");
  int currentStage=CompanionProgression.stageFor(progress.totals(user.getId()).getXp());
  if(stage>currentStage)throw new ResponseStatusException(HttpStatus.CONFLICT,"Mốc bạn đồng hành này chưa đạt.");
  if(!acknowledgements.existsByUserIdAndStage(user.getId(),stage))acknowledgements.save(new CompanionMilestoneAck(user.getId(),stage,Instant.now()));
  return response(user.getId(),row);
 }
 private Integer pendingMilestone(Long owner,CompanionPreference preference,int stage){
  if(preference.revision==0||!preference.visible)return null;
  for(int candidate=2;candidate<=stage;candidate++)if(!acknowledgements.existsByUserIdAndStage(owner,candidate))return candidate;
  return null;
 }
 private void acknowledgeThrough(Long owner,int stage){for(int candidate=2;candidate<=stage;candidate++)if(!acknowledgements.existsByUserIdAndStage(owner,candidate))acknowledgements.save(new CompanionMilestoneAck(owner,candidate,Instant.now()));}
}
