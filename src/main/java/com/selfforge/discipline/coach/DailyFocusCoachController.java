package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.HabitRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/coach/daily-focus")
public class DailyFocusCoachController {
    private final CurrentUserService current;
    private final HabitRepository habits;
    private final DailyCheckInRepository checkIns;
    private final UserTime time;
    private final DailyFocusCoachService coach;
    private final DailyFocusCoachRequestLimiter limiter;
    private final AiCoachQuota quota;

    public DailyFocusCoachController(CurrentUserService current, HabitRepository habits, DailyCheckInRepository checkIns,
            UserTime time, DailyFocusCoachService coach, DailyFocusCoachRequestLimiter limiter, AiCoachQuota quota) {
        this.current = current; this.habits = habits; this.checkIns = checkIns; this.time = time;
        this.coach = coach; this.limiter = limiter; this.quota = quota;
    }

    public record Status(boolean available, int limit, int remaining) { }
    public record Request(@NotNull @Min(5) @Max(240) Integer budget,
            @NotNull @Pattern(regexp = "LOW|MEDIUM|HIGH") String energy,
            @NotEmpty @Size(max = 3) List<@NotNull @Positive Long> habitIds,
            @NotNull Boolean consent, @NotNull @Pattern(regexp = "vi|en") String language) { }

    @GetMapping("/status")
    public Status status(HttpServletRequest request) {
        var user = current.requireUser(request);
        var usage = quota.status(user, AiCoachFeature.DAILY_FOCUS);
        return new Status(coach.available(), usage.limit(), usage.remaining());
    }

    @PostMapping
    public DailyFocusCoachService.Plan generate(@Valid @RequestBody Request body, HttpServletRequest request) {
        var user = current.requireUser(request);
        if (!body.consent()) throw new IllegalArgumentException("Bạn cần đồng ý gửi đúng dữ liệu kế hoạch hôm nay đã mô tả trước khi dùng AI.");
        LocalDate today = time.today(user);
        List<DailyFocusCoachService.FocusHabit> selected = selectedHabits(user.getId(), body.habitIds(), today);
        if (!coach.available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI kế hoạch hôm nay chưa được cấu hình.");
        limiter.acquire(user.getId(), today);
        quota.consume(user, AiCoachFeature.DAILY_FOCUS);
        try {
            return coach.generate(body.budget(), body.energy(), selected, body.language());
        } catch (IllegalStateException failure) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không nhận được gợi ý AI lúc này. Hãy đợi trước khi thử lại.");
        }
    }

    private List<DailyFocusCoachService.FocusHabit> selectedHabits(Long userId, List<Long> ids, LocalDate today) {
        if (ids.stream().distinct().count() != ids.size()) throw new IllegalArgumentException("Danh sách việc tập trung không được trùng.");
        var result = new ArrayList<DailyFocusCoachService.FocusHabit>();
        for (Long id : ids) {
            var habit = habits.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (!habit.isActive() || habit.getUser() == null || !Objects.equals(habit.getUser().getId(), userId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
            if (checkIns.findByHabit_User_IdAndHabitIdAndDate(userId, id, today)
                    .map(checkIn -> checkIn.getStatus() == CheckInStatus.COMPLETED).orElse(false)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Không thể xin gợi ý cho thói quen đã hoàn thành hôm nay.");
            }
            result.add(new DailyFocusCoachService.FocusHabit(habit.getId(), habit.getName(), habit.getDifficulty(), habit.getTargetPerWeek()));
        }
        return List.copyOf(result);
    }
}
