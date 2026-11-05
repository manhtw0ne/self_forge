package com.selfforge.discipline.goal;
import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@RestController
@RequestMapping("/api/habits/goal-links")
@Transactional(readOnly=true)
public class HabitGoalLinkController {
 private final CurrentUserService current;
 private final GoalHabitPlanRepository plans;
 public HabitGoalLinkController(CurrentUserService current,GoalHabitPlanRepository plans){this.current=current;this.plans=plans;}
 @GetMapping public List<HabitGoalLink> list(HttpServletRequest request){return plans.linksForOwner(current.requireUser(request).getId());}
}
