package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.goal.GoalRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/coach/goals/{goalId}")
public class GoalCoachController {
    private final CurrentUserService current;
    private final GoalRepository goals;
    private final GoalCoachService coach;
    private final GoalCoachRequestLimiter limiter;
    private final AiCoachQuota quota;
    private final GoalCoachPlanStore savedPlans;

    public GoalCoachController(CurrentUserService current, GoalRepository goals,
            GoalCoachService coach, GoalCoachRequestLimiter limiter, AiCoachQuota quota,
            GoalCoachPlanStore savedPlans) {
        this.current = current;
        this.goals = goals;
        this.coach = coach;
        this.limiter = limiter;
        this.quota = quota;
        this.savedPlans = savedPlans;
    }

    public record Status(boolean available, int limit, int remaining) {}
    public record Request(@NotNull Boolean consent, @NotNull @Pattern(regexp = "vi|en") String language) {}

    @GetMapping("/status")
    public Status status(@PathVariable Long goalId, HttpServletRequest request) {
        var user = current.requireUser(request);
        requireGoal(goalId, user.getId());
        var usage = quota.status(user, AiCoachFeature.GOAL);
        return new Status(coach.available(), usage.limit(), usage.remaining());
    }

    @GetMapping("/advice")
    public ResponseEntity<GoalCoachService.Plan> saved(@PathVariable Long goalId,
            @org.springframework.web.bind.annotation.RequestParam @Pattern(regexp = "vi|en") String language,
            HttpServletRequest request) {
        var user = current.requireUser(request);
        var value = savedPlans.find(user, requireGoal(goalId, user.getId()), language);
        return value == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(value);
    }

    @DeleteMapping("/advice")
    public ResponseEntity<Void> deleteSaved(@PathVariable Long goalId,
            @org.springframework.web.bind.annotation.RequestParam @Pattern(regexp = "vi|en") String language,
            HttpServletRequest request) {
        var user = current.requireUser(request);
        savedPlans.delete(user, requireGoal(goalId, user.getId()), language);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public GoalCoachService.Plan generate(@PathVariable Long goalId, @Valid @RequestBody Request body,
            HttpServletRequest request) {
        var user = current.requireUser(request);
        if (!body.consent()) throw new IllegalArgumentException("Bạn cần đồng ý gửi nội dung mục tiêu đã mô tả trước khi dùng AI.");
        var goal = requireGoal(goalId, user.getId());
        var existing = savedPlans.find(user, goal, body.language());
        if (existing != null) return existing;
        if (!coach.available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI planner chưa được cấu hình.");
        limiter.acquire(user.getId(), goalId);
        quota.consume(user, AiCoachFeature.GOAL);
        try {
            return savedPlans.save(user, goal, body.language(), coach.generate(goal, body.language()));
        } catch (IllegalStateException failure) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không nhận được kế hoạch AI lúc này. Hãy đợi trước khi thử lại.");
        }
    }

    private com.selfforge.discipline.goal.Goal requireGoal(Long goalId, Long userId) {
        return goals.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
