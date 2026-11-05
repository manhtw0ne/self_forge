package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/coach/restart")
public class RestartCoachController {
    private final CurrentUserService current;
    private final RestartCoachService coach;
    private final RestartCoachRequestLimiter limiter;
    private final AiCoachQuota quota;

    public RestartCoachController(CurrentUserService current, RestartCoachService coach, RestartCoachRequestLimiter limiter, AiCoachQuota quota) {
        this.current = current;
        this.coach = coach;
        this.limiter = limiter;
        this.quota = quota;
    }

    public record Status(boolean available, int limit, int remaining) {}
    public record Request(@NotBlank @Size(max = 255) String name,
            @NotNull @Pattern(regexp = "BUSY|HARD|FORGOT|REST") String reason,
            @NotNull Boolean consent, @NotNull @Pattern(regexp = "vi|en") String language) {}

    @GetMapping("/status")
    public Status status(HttpServletRequest request) {
        var user = current.requireUser(request);
        var usage = quota.status(user, AiCoachFeature.RESTART);
        return new Status(coach.available(), usage.limit(), usage.remaining());
    }

    @PostMapping
    public RestartCoachService.Draft generate(@Valid @RequestBody Request body, HttpServletRequest request) {
        var user = current.requireUser(request);
        if (!body.consent()) throw new IllegalArgumentException("Bạn cần đồng ý gửi nội dung đã mô tả trước khi dùng AI.");
        if (!coach.available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI restart coach chưa được cấu hình.");
        limiter.acquire(user.getId());
        quota.consume(user, AiCoachFeature.RESTART);
        try {
            return coach.generate(body.name(), body.reason(), body.language());
        } catch (IllegalStateException failure) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không nhận được kế hoạch AI lúc này. Hãy đợi trước khi thử lại.");
        }
    }
}
