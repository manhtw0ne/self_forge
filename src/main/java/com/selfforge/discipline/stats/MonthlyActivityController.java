package com.selfforge.discipline.stats;
import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.YearMonth;
@RestController
@RequestMapping("/api/stats/activity")
public class MonthlyActivityController {
 private final MonthlyActivityService service;private final CurrentUserService users;
 public MonthlyActivityController(MonthlyActivityService service,CurrentUserService users){this.service=service;this.users=users;}
 @GetMapping("/monthly")
 public MonthlyActivityService.Summary monthly(@RequestParam(required=false) @DateTimeFormat(pattern="yyyy-MM") YearMonth month,HttpServletRequest request){return service.summarize(users.requireUser(request),month);}
}
