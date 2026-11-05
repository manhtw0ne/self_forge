package com.selfforge.discipline.dailyfocus;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.habit.HabitRepository;
import com.selfforge.discipline.habit.HabitSchedule;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** A small, account-synchronised plan for the user's current account date. */
@RestController
@RequestMapping("/api/daily-focus-plans")
@Transactional
public class DailyFocusPlanController {
    private final CurrentUserService current;
    private final AppUserRepository users;
    private final DailyFocusPlanRepository plans;
    private final HabitRepository habits;
    private final DailyCheckInRepository checkIns;
    private final UserTime time;

    public DailyFocusPlanController(CurrentUserService current, AppUserRepository users, DailyFocusPlanRepository plans,
            HabitRepository habits, DailyCheckInRepository checkIns, UserTime time) {
        this.current = current; this.users = users; this.plans = plans; this.habits = habits; this.checkIns = checkIns; this.time = time;
    }

    public record Request(@NotNull @Min(5) @Max(240) Integer budget,
            @NotBlank @Pattern(regexp = "LOW|MEDIUM|HIGH") String energy,
            @NotEmpty @Size(max = 3) List<@NotNull @Positive Long> habitIds,
            @NotNull @Min(0) Long expectedVersion) {}
    public record Response(LocalDate date, int budget, String energy, List<Long> habitIds, long version) {}

    @GetMapping
    @Transactional(readOnly = true)
    public Response get(HttpServletRequest request) {
        AppUser user = current.requireUser(request);
        return plans.findByUserIdAndPlanDate(user.getId(), time.today(user)).map(this::response).orElse(null);
    }

    @PutMapping
    public Response save(@Valid @RequestBody Request body, HttpServletRequest request) {
        AppUser user = lock(request);
        LocalDate today = time.today(user);
        List<Long> ids = validatedHabitIds(user, body.habitIds(), today);
        String storedIds = ids.stream().map(String::valueOf).collect(Collectors.joining(","));
        DailyFocusPlan row = plans.findByUserIdAndPlanDate(user.getId(), today).orElseGet(() -> new DailyFocusPlan(user.getId(), today));
        boolean same = row.budget == body.budget() && Objects.equals(row.energy, body.energy()) && Objects.equals(row.habitIds, storedIds);
        if (same && (body.expectedVersion() == row.revision || body.expectedVersion() == row.revision - 1)) return response(row);
        if (body.expectedVersion() != row.revision) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Kế hoạch tập trung hôm nay đã thay đổi. Tải bản đã lưu trước khi sửa tiếp.");
        }
        row.budget = body.budget(); row.energy = body.energy(); row.habitIds = storedIds; row.revision++;
        return response(plans.save(row));
    }

    private AppUser lock(HttpServletRequest request) {
        AppUser user = users.lockById(current.requireUser(request).getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        current.requireUser(request);
        return user;
    }

    private List<Long> validatedHabitIds(AppUser user, List<Long> requested, LocalDate today) {
        if (requested.stream().distinct().count() != requested.size()) throw new IllegalArgumentException("Danh sách việc tập trung không được trùng.");
        var result = new ArrayList<Long>();
        for (Long id : requested) {
            var habit = habits.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (!habit.isActive() || habit.getUser() == null || !Objects.equals(habit.getUser().getId(), user.getId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
            // A daily focus plan is an aid for the account's due habits, not
            // a way to silently turn a scheduled rest day into an obligation.
            // Keeping this validation on the server also protects a stale tab
            // whose Dashboard data predates a schedule change.
            if (!HabitSchedule.includes(habit.getScheduledDays(), today)) {
                throw new IllegalStateException("Thói quen này không có lịch thực hiện hôm nay. Chọn một việc đến lịch khác.");
            }
            if (checkIns.findByHabit_User_IdAndHabitIdAndDate(user.getId(), id, today)
                    .map(checkIn -> checkIn.getStatus() == CheckInStatus.COMPLETED).orElse(false)) {
                throw new IllegalStateException("Không thể thêm thói quen đã hoàn thành hôm nay vào kế hoạch tập trung.");
            }
            result.add(id);
        }
        return List.copyOf(result);
    }

    private Response response(DailyFocusPlan row) {
        List<Long> ids = java.util.Arrays.stream(row.habitIds.split(",")).map(Long::valueOf).toList();
        return new Response(row.planDate, row.budget, row.energy, ids, row.revision);
    }
}
