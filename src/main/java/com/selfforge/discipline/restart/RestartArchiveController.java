package com.selfforge.discipline.restart;
import com.selfforge.discipline.auth.CurrentUserService;import jakarta.servlet.http.HttpServletRequest;import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import java.time.Instant;import java.util.List;
@RestController @RequestMapping("/api/restart-plan/history") @Transactional(readOnly=true)
public class RestartArchiveController {
 private final CurrentUserService current;private final RestartArchiveRepository archives;private final RestartArchiveService service;
 public RestartArchiveController(CurrentUserService current,RestartArchiveRepository archives,RestartArchiveService service){this.current=current;this.archives=archives;this.service=service;}
 public record Entry(Long id,Instant archivedAt,RestartArchiveService.Snapshot snapshot){}
 public record Response(List<Entry> items,Long nextCursor){}
 @GetMapping public Response get(@RequestParam(required=false)Long beforeId,HttpServletRequest request){var user=current.requireUser(request);if(beforeId!=null&&beforeId<=0)throw new IllegalArgumentException("Mã phân trang không hợp lệ.");var rows=archives.history(user.getId(),beforeId==null?Long.MAX_VALUE:beforeId,org.springframework.data.domain.PageRequest.of(0,21));var items=rows.stream().limit(20).map(row->new Entry(row.id,row.archivedAt,service.read(row))).toList();return new Response(items,rows.size()>20?items.getLast().id():null);}
}
