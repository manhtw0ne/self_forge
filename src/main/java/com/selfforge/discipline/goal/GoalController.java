package com.selfforge.discipline.goal;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.auth.PremiumController;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@org.springframework.transaction.annotation.Transactional
@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalRepository goalRepository;
    private final GoalProgressReceiptRepository receipts;
    private final com.selfforge.discipline.auth.AppUserRepository users;
    private final CurrentUserService currentUserService;

    public GoalController(GoalRepository goalRepository, CurrentUserService currentUserService, com.selfforge.discipline.auth.AppUserRepository users, GoalProgressReceiptRepository receipts) {
        this.receipts = receipts;
        this.users = users;
        this.goalRepository = goalRepository;
        this.currentUserService = currentUserService;
    }

    public record CreateGoalRequest(@NotBlank @Size(max = 255) String name, @Size(max = 255) String description, @Positive int targetValue, @Size(max = 255) String unit, String deadline) {}
    public record UpdateGoalRequest(@Size(max = 255) String name, @Size(max = 255) String description, @Positive Integer targetValue, @Size(max = 255) String unit, String deadline, Boolean clearDeadline) {}
    public record AddProgressRequest(@Positive int amount, @Pattern(regexp = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}") String requestId) {}
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
    public GoalResponse create(@Valid @RequestBody CreateGoalRequest req, HttpServletRequest request) {
        AppUser user = users.lockById(currentUserService.requireUser(request).getId()).orElseThrow();
        // Enforce goal limit for free users
        if (!user.isPremium()) {
            long activeCount = goalRepository.countByUserIdAndStatus(user.getId(), GoalStatus.ACTIVE);
            if (activeCount >= PremiumController.FREE_MAX_GOALS) {
                throw new IllegalStateException(
                        "Bạn đã đạt giới hạn " + PremiumController.FREE_MAX_GOALS
                                + " mục tiêu. Nâng cấp Premium để tạo không giới hạn!");
            }
        }
        LocalDate deadline = parseDeadline(req.deadline());
        Goal goal = goalRepository.save(new Goal(user, req.name(), req.description(), req.targetValue(), req.unit(), deadline));
        return GoalResponse.from(goal);
    }

    @PatchMapping("/{id}")
    public GoalResponse update(@PathVariable Long id, @Valid @RequestBody UpdateGoalRequest req, HttpServletRequest request) {
        AppUser user = users.lockById(currentUserService.requireUser(request).getId()).orElseThrow();
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        if (Boolean.TRUE.equals(req.clearDeadline()) && req.deadline() != null && !req.deadline().isBlank()) {
            throw new IllegalArgumentException("Không thể vừa đặt vừa xóa hạn chót.");
        }
        LocalDate deadline = parseDeadline(req.deadline());
        goal.update(req.name(), req.description(), req.targetValue(), req.unit(), deadline);
        if (Boolean.TRUE.equals(req.clearDeadline())) goal.clearDeadline();
        return GoalResponse.from(goal);
    }

    @PostMapping("/{id}/restore")
    public GoalResponse restore(@PathVariable Long id, HttpServletRequest request) {
        AppUser user = users.lockById(currentUserService.requireUser(request).getId()).orElseThrow();
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        if (goal.getStatus() == GoalStatus.ACTIVE) return GoalResponse.from(goal);
        if (!user.isPremium() && goalRepository.countByUserIdAndStatus(user.getId(), GoalStatus.ACTIVE) >= PremiumController.FREE_MAX_GOALS) {
            throw new IllegalStateException("Bạn đã có 3 mục tiêu đang thực hiện. Hãy hoàn thành hoặc hủy một mục tiêu trước khi khôi phục.");
        }
        goal.restore();
        return GoalResponse.from(goal);
    }

    @PostMapping("/{id}/progress")
    public GoalResponse addProgress(@PathVariable Long id, @Valid @RequestBody AddProgressRequest req, HttpServletRequest request) {
        AppUser user = users.lockById(currentUserService.requireUser(request).getId()).orElseThrow();
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        String key = req.requestId() == null ? null : req.requestId().toLowerCase(java.util.Locale.ROOT);
        if (key != null) {
            var receipt = receipts.findByGoalIdAndRequestKey(id, key);
            if (receipt.isPresent()) {
                if (receipt.get().getAmount() != req.amount()) {
                    throw new IllegalStateException("Mã thao tác đã được dùng với số lượng khác.");
                }
                return GoalResponse.from(goal);
            }
        }
        goal.addProgress(req.amount());
        if (key != null) receipts.save(new GoalProgressReceipt(id, key, req.amount()));
        return GoalResponse.from(goal);
    }

    @PostMapping("/{id}/abandon")
    public GoalResponse abandon(@PathVariable Long id, HttpServletRequest request) {
        AppUser user = users.lockById(currentUserService.requireUser(request).getId()).orElseThrow();
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        goal.abandon();
        return GoalResponse.from(goal);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest request) {
        AppUser user = users.lockById(currentUserService.requireUser(request).getId()).orElseThrow();
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        receipts.deleteByGoalId(id);
        goalRepository.delete(goal);
    }

    private static LocalDate parseDeadline(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (java.time.format.DateTimeParseException exception) {
            throw new IllegalArgumentException("Hạn hoàn thành phải là ngày hợp lệ theo định dạng YYYY-MM-DD.");
        }
    }
}
