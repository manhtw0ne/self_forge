package com.selfforge.discipline.insight;
import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
@RestController
@RequestMapping("/api/insights")
public class WeeklyInsightController {
 private final WeeklyInsightService insights;
 private final CurrentUserService current;
 public WeeklyInsightController(WeeklyInsightService insights,CurrentUserService current) {this.insights=insights;this.current=current;}
 @GetMapping("/weekly")
 public WeeklyInsightService.Snapshot weekly(@RequestParam(required=false) LocalDate date,HttpServletRequest request) {
  return insights.summarize(current.requireUser(request),date);
 }
}
