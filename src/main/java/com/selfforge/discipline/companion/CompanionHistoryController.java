package com.selfforge.discipline.companion;
import com.selfforge.discipline.auth.CurrentUserService;import com.selfforge.discipline.checkin.CheckInStatus;
import jakarta.servlet.http.HttpServletRequest;import org.springframework.beans.factory.annotation.Value;import org.springframework.data.domain.PageRequest;import org.springframework.transaction.annotation.Transactional;import org.springframework.web.bind.annotation.*;
import java.time.*;import java.util.List;
@RestController @RequestMapping("/api/companion/history") @Transactional(readOnly=true)
public class CompanionHistoryController {
 private final CurrentUserService current;private final CompanionHistoryRepository history;private final boolean available;
 public CompanionHistoryController(CurrentUserService current,CompanionHistoryRepository history,@Value("${app.companion.enabled:true}") boolean available){this.current=current;this.history=history;this.available=available;}
 public record Event(Long id,Long checkInId,String habitName,LocalDate date,Instant changedAt,int delta,String reason){}
 public record Page(List<Event> items,Long nextCursor){}
 @GetMapping public Page get(@RequestParam(required=false) Long beforeId,HttpServletRequest request){
  var user=current.requireUser(request);if(!available)throw new IllegalStateException("Bạn đồng hành đang tạm tắt.");
  if(beforeId!=null&&beforeId<=0)throw new IllegalArgumentException("Mã trang lịch sử không hợp lệ.");
  var rows=history.history(user.getId(),beforeId,CheckInStatus.COMPLETED,PageRequest.of(0,21));
  var items=rows.stream().limit(20).map(row->{boolean credit=row.toStatus()==CheckInStatus.COMPLETED;return new Event(row.id(),row.checkInId(),row.habitName(),row.date(),row.changedAt(),credit?row.points():-row.points(),credit?"COMPLETED":"REVERSED");}).toList();
  return new Page(items,rows.size()>20?items.getLast().id():null);
 }
}
