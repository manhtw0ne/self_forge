package com.selfforge.discipline.journal;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.common.UserTime;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;import java.util.List;
@RestController @RequestMapping("/api/journal") @Transactional(readOnly=true)
public class JournalMonthController {
 private final CurrentUserService current;private final JournalRepository journals;private final UserTime time;
 public JournalMonthController(CurrentUserService current,JournalRepository journals,UserTime time){this.current=current;this.journals=journals;this.time=time;}
 public record Response(String month,LocalDate observedThrough,String timezone,List<JournalResponse> items){}
 @GetMapping("/month") public Response get(@RequestParam String month,HttpServletRequest request){
  var user=current.requireUser(request);YearMonth selected;
  try{if(!month.matches("[0-9]{4}-[0-9]{2}"))throw new IllegalArgumentException();selected=YearMonth.parse(month);if(selected.getYear()<1||selected.isAfter(YearMonth.from(time.today(user))))throw new IllegalArgumentException();}catch(RuntimeException invalid){throw new IllegalArgumentException("Chọn tháng hợp lệ, không ở tương lai.");}
  var today=time.today(user);var through=selected.atEndOfMonth().isAfter(today)?today:selected.atEndOfMonth();
  return new Response(month,through,time.zone(user).getId(),journals.findByUserIdAndDateBetweenOrderByDateAsc(user.getId(),selected.atDay(1),through).stream().map(JournalResponse::from).toList());
 }
}
