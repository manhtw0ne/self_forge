package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.HabitRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/coach/habit")
public class HabitCoachController {
    private final CurrentUserService current;
    private final HabitRepository habits;
    private final DailyCheckInRepository checkIns;
    private final UserTime time;
    private final HabitCoachService coach;
    private final HabitCoachRequestLimiter limiter;
    private final AiCoachQuota quota;

    public HabitCoachController(CurrentUserService current, HabitRepository habits, DailyCheckInRepository checkIns,
            UserTime time, HabitCoachService coach, HabitCoachRequestLimiter limiter, AiCoachQuota quota) {
        this.current = current; this.habits = habits; this.checkIns = checkIns; this.time = time;
        this.coach = coach; this.limiter = limiter; this.quota = quota;
    }

    public record Status(boolean available, int limit, int remaining) { }
    public record Request(@NotBlank @Size(min = 5, max = HabitCoachService.MAX_QUESTION_CHARACTERS) String question,
            @Positive Long habitId, @NotNull Boolean consent,
            @NotNull @Pattern(regexp = "vi|en") String language) { }

    @GetMapping("/status")
    public Status status(HttpServletRequest request) {
        var user = current.requireUser(request);
        var usage = quota.status(user, AiCoachFeature.CHAT);
        return new Status(coach.available(), usage.limit(), usage.remaining());
    }

    @PostMapping
    public HabitCoachService.Reply generate(@Valid @RequestBody Request body, HttpServletRequest request) {
        var user = current.requireUser(request);
        if (!body.consent()) throw new IllegalArgumentException("Bạn cần đồng ý gửi đúng dữ liệu Coach đã mô tả trước khi dùng AI.");
        String question = HabitCoachService.question(body.question());
        HabitCoachService.HabitSummary habit = body.habitId() == null ? null : summary(user.getId(), body.habitId(), time.today(user));
        if (!coach.available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI Coach chưa được cấu hình.");
        limiter.acquire(user.getId());
        quota.consume(user, AiCoachFeature.CHAT);
        try {
            return coach.generate(question, habit, body.language());
        } catch (IllegalStateException failure) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không nhận được phản hồi AI lúc này. Hãy đợi trước khi thử lại.");
        }
    }

    private HabitCoachService.HabitSummary summary(Long userId, Long habitId, LocalDate today) {
        var habit = habits.findById(habitId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!habit.isActive() || habit.getUser() == null || !Objects.equals(habit.getUser().getId(), userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        var records = checkIns.findByHabit_User_IdAndHabitIdAndDateBetween(userId, habitId, today.minusDays(27), today);
        int completed = 0, skipped = 0, failed = 0;
        for (var record : records) {
            if (record.getStatus() == CheckInStatus.COMPLETED) completed++;
            else if (record.getStatus() == CheckInStatus.SKIPPED) skipped++;
            else if (record.getStatus() == CheckInStatus.FAILED) failed++;
        }
        return new HabitCoachService.HabitSummary(habit.getId(), habit.getName(), habit.getDifficulty(),
                habit.getTargetPerWeek(), 28, completed, skipped, failed);
    }
}
