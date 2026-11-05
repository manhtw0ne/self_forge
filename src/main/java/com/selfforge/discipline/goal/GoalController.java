package com.selfforge.discipline.goal;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.auth.PremiumController;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.web.server.ResponseStatusException;
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

    @PersistenceContext
    private EntityManager entityManager;

    private final GoalProgressCorrectionRepository corrections;
    private final GoalRepository goalRepository;
    private final GoalProgressReceiptRepository receipts;
    private final GoalCreateReceiptRepository createReceipts;
    private final com.selfforge.discipline.auth.AppUserRepository users;
    private final CurrentUserService currentUserService;
    private final ObjectMapper json;

    public GoalController(GoalRepository goalRepository, CurrentUserService currentUserService,
            com.selfforge.discipline.auth.AppUserRepository users, GoalProgressReceiptRepository receipts,
            GoalProgressCorrectionRepository corrections, GoalCreateReceiptRepository createReceipts,
            ObjectMapper json) {
        this.corrections=corrections;
        this.receipts = receipts;
        this.createReceipts = createReceipts;
        this.users = users;
        this.goalRepository = goalRepository;
        this.currentUserService = currentUserService;
        this.json = json;
    }

    public record CreateGoalRequest(@NotBlank @Size(max = 255) String name, @Size(max = 255) String description,
            @Positive int targetValue, @Size(max = 255) String unit, String deadline,
            @Pattern(regexp = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}") String requestId) {}
    public record GoalSnapshot(@NotNull @Positive Long id, @NotNull @Size(max = 255) String name,
            @Size(max = 255) String description, @Positive int targetValue, @Min(0) int currentValue,
            @Size(max = 255) String unit, LocalDate deadline, @NotNull GoalStatus status) { }
    public record UpdateGoalRequest(@Size(max = 255) String name, @Size(max = 255) String description, @Positive Integer targetValue, @Size(max = 255) String unit, String deadline, Boolean clearDeadline, @Valid GoalSnapshot expected) {}
    public record CorrectProgressRequest(@NotNull @Min(0) Integer currentValue,@NotNull @Valid GoalSnapshot expected) {}
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
        AppUser user = lockCurrentUser(request);
        String requestId = req.requestId() == null ? null : req.requestId().toLowerCase(java.util.Locale.ROOT);
        String fingerprint = fingerprint(req);
        if (requestId != null) {
            var prior = createReceipts.findByUserIdAndRequestId(user.getId(), requestId);
            if (prior.isPresent()) {
                if (!prior.get().getFingerprint().equals(fingerprint)) {
                    throw new IllegalStateException("Mã yêu cầu đã được dùng cho mục tiêu khác.");
                }
                return goalRepository.findByIdAndUserId(prior.get().getGoalId(), user.getId())
                        .map(GoalResponse::from)
                        .orElseThrow(() -> new IllegalStateException("Mục tiêu của yêu cầu này đã bị xóa."));
            }
        }
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
        if (requestId != null) createReceipts.save(new GoalCreateReceipt(user.getId(), requestId, fingerprint, goal.getId()));
        return GoalResponse.from(goal);
    }

    @PatchMapping("/{id}")
    public GoalResponse update(@PathVariable Long id, @Valid @RequestBody UpdateGoalRequest req, HttpServletRequest request) {
        AppUser user = lockCurrentUser(request);
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        requireSnapshot(goal, req.expected(), "Mục tiêu trên máy chủ đã thay đổi. Nội dung đang sửa được giữ; xem bản mới trước khi lưu tiếp.");
        if (Boolean.TRUE.equals(req.clearDeadline()) && req.deadline() != null && !req.deadline().isBlank()) {
            throw new IllegalArgumentException("Không thể vừa đặt vừa xóa hạn chót.");
        }
        LocalDate deadline = parseDeadline(req.deadline());
        goal.update(req.name(), req.description(), req.targetValue(), req.unit(), deadline);
        if (Boolean.TRUE.equals(req.clearDeadline())) goal.clearDeadline();
        return GoalResponse.from(goal);
    }

    @PostMapping("/{id}/restore")
    public GoalResponse restore(@PathVariable Long id, @Valid @RequestBody(required = false) GoalSnapshot expected, HttpServletRequest request) {
        AppUser user = lockCurrentUser(request);
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        requireSnapshot(goal, expected, "Mục tiêu đã thay đổi. Tải lại danh sách và kiểm tra trước khi tiếp tục.");
        if (goal.getStatus() == GoalStatus.ACTIVE) return GoalResponse.from(goal);
        if (!user.isPremium() && goalRepository.countByUserIdAndStatus(user.getId(), GoalStatus.ACTIVE) >= PremiumController.FREE_MAX_GOALS) {
            throw new IllegalStateException("Bạn đã có 3 mục tiêu đang thực hiện. Hãy hoàn thành hoặc hủy một mục tiêu trước khi khôi phục.");
        }
        goal.restore();
        return GoalResponse.from(goal);
    }

    @PostMapping("/{id}/progress")
    public GoalResponse addProgress(@PathVariable Long id, @Valid @RequestBody AddProgressRequest req, HttpServletRequest request) {
        AppUser user = lockCurrentUser(request);
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
        int previousValue=goal.getCurrentValue();var previousStatus=goal.getStatus();
        goal.addProgress(req.amount());
        corrections.save(new GoalProgressCorrection(goal,previousValue,previousStatus,"ADD"));
        if (key != null) receipts.save(new GoalProgressReceipt(id, key, req.amount()));
        return GoalResponse.from(goal);
    }

    @PatchMapping("/{id}/progress")
    public GoalResponse correctProgress(@PathVariable Long id,@Valid @RequestBody CorrectProgressRequest body,HttpServletRequest request) {
        var user=lockCurrentUser(request);
        var goal=goalRepository.findByIdAndUserId(id,user.getId()).orElseThrow(()->new EntityNotFoundException("Goal not found"));
        if(goal.getStatus()==GoalStatus.ABANDONED)throw new IllegalStateException("Khôi phục mục tiêu trước khi điều chỉnh tiến độ.");
        if(body.currentValue()>goal.getTargetValue())throw new IllegalArgumentException("Số lượng thực tế phải từ 0 đến chỉ tiêu.");
        if(!body.expected().id().equals(id))throw new IllegalStateException("Mục tiêu không khớp bản đã xem.");
        // Retrying an already applied absolute value never adds progress again.
        if(goal.getCurrentValue()==body.currentValue()&&goal.getStatus()==(body.currentValue()==goal.getTargetValue()?GoalStatus.COMPLETED:GoalStatus.ACTIVE))return GoalResponse.from(goal);
        requireSnapshot(goal,body.expected(),"Mục tiêu đã thay đổi. Xem bản mới trước khi điều chỉnh số lượng.");
        if(goal.getStatus()==GoalStatus.COMPLETED&&body.currentValue()<goal.getTargetValue()&&!user.isPremium()&&goalRepository.countByUserIdAndStatus(user.getId(),GoalStatus.ACTIVE)>=PremiumController.FREE_MAX_GOALS)throw new IllegalStateException("Bạn đã có 3 mục tiêu đang thực hiện. Giảm số mục tiêu đang thực hiện trước khi mở lại mục tiêu này.");
        int previousValue=goal.getCurrentValue();var previousStatus=goal.getStatus();
        goal.correctProgress(body.currentValue());
        corrections.save(new GoalProgressCorrection(goal,previousValue,previousStatus));
        return GoalResponse.from(goal);
    }

    @PostMapping("/{id}/abandon")
    public GoalResponse abandon(@PathVariable Long id, @Valid @RequestBody(required = false) GoalSnapshot expected, HttpServletRequest request) {
        AppUser user = lockCurrentUser(request);
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        requireSnapshot(goal, expected, "Mục tiêu đã thay đổi. Tải lại danh sách và kiểm tra trước khi tiếp tục.");
        goal.abandon();
        return GoalResponse.from(goal);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @Valid @RequestBody(required = false) GoalSnapshot expected, HttpServletRequest request) {
        AppUser user = lockCurrentUser(request);
        Goal goal = goalRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Goal not found"));
        requireSnapshot(goal, expected, "Mục tiêu đã thay đổi. Tải lại danh sách và kiểm tra trước khi tiếp tục.");
        corrections.deleteForGoal(id);
        receipts.deleteByGoalId(id);
        goalRepository.delete(goal);
    }

    private AppUser lockCurrentUser(HttpServletRequest request) {
        Long userId = currentUserService.requireUser(request).getId();
        AppUser user = users.lockById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        entityManager.refresh(user);
        // A session can be revoked while this transaction waits for the user lock.
        currentUserService.requireUser(request);
        return user;
    }

    static void requireSnapshot(Goal goal, GoalSnapshot expected, String message) {
        if (expected == null) return; // Older clients remain compatible.
        if (!java.util.Objects.equals(expected.id(), goal.getId()) ||
                !java.util.Objects.equals(expected.name(), goal.getName()) ||
                !text(expected.description()).equals(text(goal.getDescription())) ||
                expected.targetValue() != goal.getTargetValue() || expected.currentValue() != goal.getCurrentValue() ||
                !text(expected.unit()).equals(text(goal.getUnit())) ||
                !java.util.Objects.equals(expected.deadline(), goal.getDeadline()) || expected.status() != goal.getStatus()) {
            throw new IllegalStateException(message);
        }
    }

    private static String text(String value) { return value == null ? "" : value; }

    private String fingerprint(CreateGoalRequest request) {
        try {
            byte[] fields = json.writeValueAsBytes(java.util.List.of(
                    request.name(), text(request.description()), request.targetValue(), text(request.unit()),
                    request.deadline() == null ? "" : request.deadline()));
            return java.util.HexFormat.of().formatHex(
                    java.security.MessageDigest.getInstance("SHA-256").digest(fields));
        } catch (java.io.IOException | java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Cannot fingerprint goal request", exception);
        }
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
