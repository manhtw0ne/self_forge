package com.selfforge.discipline.goal;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.auth.PremiumController;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalRepository goalRepository;
    private final CurrentUserService currentUserService;

    public GoalController(GoalRepository goalRepository, CurrentUserService currentUserService) {
        this.goalRepository = goalRepository;
        this.currentUserService = currentUserService;
    }

    public record CreateGoalRequest(String name, String description, int targetValue, String unit, String deadline) {}
    public record UpdateGoalRequest(String name, String description, Integer targetValue, String unit, String deadline) {}
    public record AddProgressRequest(int amount) {}
    public record GoalResponse(Long id, String name, String description, int targetValue, int currentValue,
                               String unit, String deadline, String status, double progress) {
        static GoalResponse from(Goal g) {
            return new GoalResponse(g.getId(), g.getName(), g.getDescription(), g.getTargetValue(), g.getCurrentValue(),
                    g.getUnit(), g.getDeadline() != null ? g.getDeadline().toString() : null,
                    g.getStatus().name(), g.getProgress());
        }
    }

    @GetMapping
    public List<GoalResponse> list(HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        return goalRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(GoalResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GoalResponse create(@RequestBody CreateGoalRequest req, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        // Enforce goal limit for free users
        if (!user.isPremium()) {
            long activeCount = goalRepository.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), GoalStatus.ACTIVE).size();
            if (activeCount >= PremiumController.FREE_MAX_GOALS) {
                throw new IllegalStateException(
                        "Bạn đã đạt giới hạn " + PremiumController.FREE_MAX_GOALS
                                + " mục tiêu. Nâng cấp Premium để tạo không giới hạn!");
            }
        }
        LocalDate deadline = req.deadline() != null && !req.deadline().isBlank() ? LocalDate.parse(req.deadline()) : null;
        Goal goal = goalRepository.save(new Goal(user, req.name(), req.description(), req.targetValue(), req.unit(), deadline));
        return GoalResponse.from(goal);
    }

    @PatchMapping("/{id}")
    public GoalResponse update(@PathVariable Long id, @RequestBody UpdateGoalRequest req, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        LocalDate deadline = req.deadline() != null && !req.deadline().isBlank() ? LocalDate.parse(req.deadline()) : null;
        goal.update(req.name(), req.description(), req.targetValue(), req.unit(), deadline);
        return GoalResponse.from(goal);
    }

    @PostMapping("/{id}/progress")
    public GoalResponse addProgress(@PathVariable Long id, @RequestBody AddProgressRequest req, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        goal.addProgress(req.amount());
        return GoalResponse.from(goal);
    }

    @PostMapping("/{id}/abandon")
    public GoalResponse abandon(@PathVariable Long id, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        goal.abandon();
        return GoalResponse.from(goal);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        goalRepository.delete(goal);
    }
}
