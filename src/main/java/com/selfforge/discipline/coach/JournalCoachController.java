package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/coach/journal")
public class JournalCoachController {
    private final CurrentUserService current;
    private final JournalCoachService coach;
    private final JournalCoachRequestLimiter limiter;
    private final AiCoachQuota quota;

    public JournalCoachController(CurrentUserService current, JournalCoachService coach,
            JournalCoachRequestLimiter limiter, AiCoachQuota quota) {
        this.current = current;
        this.coach = coach;
        this.limiter = limiter;
        this.quota = quota;
    }

    public record Status(boolean available, int limit, int remaining) {}
    public record Request(@Size(max = JournalCoachService.MAX_FIELD_CHARACTERS) String win,
            @Size(max = JournalCoachService.MAX_FIELD_CHARACTERS) String obstacle,
            @Size(max = JournalCoachService.MAX_FIELD_CHARACTERS) String lesson,
            @Size(max = JournalCoachService.MAX_FIELD_CHARACTERS) String tomorrowFocus,
            @NotNull Boolean consent, @NotNull @Pattern(regexp = "vi|en") String language) {}

    @GetMapping("/status")
    public Status status(HttpServletRequest request) {
        var user = current.requireUser(request);
        var usage = quota.status(user, AiCoachFeature.JOURNAL);
        return new Status(coach.available(), usage.limit(), usage.remaining());
    }

    @PostMapping
    public JournalCoachService.Reflection generate(@Valid @RequestBody Request body, HttpServletRequest request) {
        var user = current.requireUser(request);
        if (!body.consent()) throw new IllegalArgumentException("Bạn cần đồng ý gửi nội dung nhật ký đã mô tả trước khi dùng AI.");
        if (!coach.available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI phản hồi nhật ký chưa được cấu hình.");
        JournalCoachService.Entry entry = JournalCoachService.entry(body.win(), body.obstacle(), body.lesson(), body.tomorrowFocus());
        limiter.acquire(user.getId());
        quota.consume(user, AiCoachFeature.JOURNAL);
        try {
            return coach.generate(entry, body.language());
        } catch (IllegalStateException failure) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không nhận được phản hồi AI cho nhật ký lúc này. Hãy đợi trước khi thử lại.");
        }
    }
}
