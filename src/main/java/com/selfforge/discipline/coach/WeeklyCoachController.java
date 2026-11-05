package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.insight.WeeklyInsightService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/coach/weekly")
public class WeeklyCoachController {
    private final CurrentUserService current;
    private final WeeklyInsightService insights;
    private final WeeklyCoachService coach;
    private final WeeklyCoachRequestLimiter limiter;
    private final AiCoachQuota quota;
    private final WeeklyCoachAdviceStore savedAdvice;

    public WeeklyCoachController(CurrentUserService current, WeeklyInsightService insights,
            WeeklyCoachService coach, WeeklyCoachRequestLimiter limiter, AiCoachQuota quota,
            WeeklyCoachAdviceStore savedAdvice) {
        this.current = current;
        this.insights = insights;
        this.coach = coach;
        this.limiter = limiter;
        this.quota = quota;
        this.savedAdvice = savedAdvice;
    }

    public record Status(boolean available, boolean journalsIncluded, int limit, int remaining) {}
    public record Request(@NotNull LocalDate weekStart, @NotNull Boolean consent,
            @NotNull @Pattern(regexp = "vi|en") String language) {}
    public record FeedbackRequest(@NotNull LocalDate weekStart, @NotNull @Pattern(regexp = "vi|en") String language,
            @Min(1) @Max(5) Integer helpfulnessRating, WeeklyCoachFeedbackDecision followUpDecision) {
        @AssertTrue(message = "Cần chọn mức hữu ích hoặc bước tiếp theo.")
        public boolean hasFeedback() { return helpfulnessRating != null || followUpDecision != null; }
    }
    public record AdviceResponse(String headline, java.util.List<WeeklyCoachService.Observation> observations,
            java.util.List<String> experiments, Integer helpfulnessRating, WeeklyCoachFeedbackDecision followUpDecision) {
        static AdviceResponse from(WeeklyCoachAdviceStore.SavedAdvice saved) {
            return new AdviceResponse(saved.advice().headline(), saved.advice().observations(), saved.advice().experiments(),
                    saved.helpfulnessRating(), saved.followUpDecision());
        }
    }

    @GetMapping("/status")
    public Status status(HttpServletRequest request) {
        var user = current.requireUser(request);
        var usage = quota.status(user, AiCoachFeature.WEEKLY);
        return new Status(coach.available(), false, usage.limit(), usage.remaining());
    }

    @GetMapping("/advice")
    public ResponseEntity<AdviceResponse> saved(@RequestParam LocalDate weekStart,
            @RequestParam @Pattern(regexp = "vi|en") String language, HttpServletRequest request) {
        var user = current.requireUser(request);
        var snapshot = insights.summarize(user, weekStart);
        var value = savedAdvice.find(user, snapshot, language);
        return value == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(AdviceResponse.from(value));
    }

    @DeleteMapping("/advice")
    public ResponseEntity<Void> deleteSaved(@RequestParam LocalDate weekStart,
            @RequestParam @Pattern(regexp = "vi|en") String language, HttpServletRequest request) {
        var user = current.requireUser(request);
        savedAdvice.delete(user, insights.summarize(user, weekStart), language);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public AdviceResponse generate(@Valid @RequestBody Request body, HttpServletRequest request) {
        var user = current.requireUser(request);
        if (!body.consent()) throw new IllegalArgumentException("Bạn cần đồng ý gửi dữ liệu tuần đã mô tả trước khi dùng AI.");
        if (!coach.available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI coach chưa được cấu hình.");
        var snapshot = insights.summarize(user, body.weekStart());
        if (!snapshot.weekStart().equals(body.weekStart())) throw new IllegalArgumentException("Chọn ngày đầu tuần hợp lệ.");
        var existing = savedAdvice.find(user, snapshot, body.language());
        if (existing != null) return AdviceResponse.from(existing);
        limiter.acquire(user.getId(), body.weekStart());
        quota.consume(user, AiCoachFeature.WEEKLY);
        try {
            return AdviceResponse.from(savedAdvice.save(user, snapshot, body.language(), coach.generate(snapshot, body.language())));
        } catch (IllegalStateException failure) {
            // Never surface provider responses or request contents to the browser.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không nhận được gợi ý AI lúc này. Hãy đợi trước khi thử lại.");
        }
    }

    @PutMapping("/advice/feedback")
    public AdviceResponse feedback(@Valid @RequestBody FeedbackRequest body, HttpServletRequest request) {
        var user = current.requireUser(request);
        var snapshot = insights.summarize(user, body.weekStart());
        if (!snapshot.weekStart().equals(body.weekStart())) throw new IllegalArgumentException("Chọn ngày đầu tuần hợp lệ.");
        return AdviceResponse.from(savedAdvice.recordFeedback(user, snapshot, body.language(),
                body.helpfulnessRating(), body.followUpDecision()));
    }

    @DeleteMapping("/advice/feedback")
    public ResponseEntity<Void> clearFeedback(@RequestParam LocalDate weekStart,
            @RequestParam @Pattern(regexp = "vi|en") String language, HttpServletRequest request) {
        var user = current.requireUser(request);
        savedAdvice.clearFeedback(user, insights.summarize(user, weekStart), language);
        return ResponseEntity.noContent().build();
    }
}
