package com.selfforge.discipline.companion;

import com.selfforge.discipline.auth.CurrentUserService;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.common.UserTime;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashSet;

/**
 * A deliberately small, read-only estimate. It describes a user's recent
 * recorded rhythm; it never creates work, XP, reminders, or a deadline.
 */
@RestController
@RequestMapping("/api/companion/rhythm")
@Transactional(readOnly = true)
public class CompanionRhythmController {
    static final int WINDOW_DAYS = 28;
    static final int MAX_FORECAST_DAYS = 365;

    private final CurrentUserService current;
    private final DailyCheckInRepository checkIns;
    private final CompanionProgressRepository progress;
    private final UserTime time;
    private final boolean available;

    public CompanionRhythmController(CurrentUserService current, DailyCheckInRepository checkIns,
                                    CompanionProgressRepository progress, UserTime time,
                                    @Value("${app.companion.enabled:true}") boolean available) {
        this.current = current;
        this.checkIns = checkIns;
        this.progress = progress;
        this.time = time;
        this.available = available;
    }

    public record Summary(LocalDate windowStart, LocalDate observedThrough, String timezone,
                          int periodDays, long periodXp, int contributingDays,
                          long companionXp, int stage, Long nextThreshold,
                          long remainingXp, LocalDate estimatedReachDate) { }

    @GetMapping
    public Summary get(HttpServletRequest request) {
        var user = current.requireUser(request);
        if (!available) throw new IllegalStateException("Bạn đồng hành đang tạm tắt.");

        LocalDate today = time.today(user);
        LocalDate start = today.minusDays(WINDOW_DAYS - 1L);
        long periodXp = 0;
        var contributingDates = new HashSet<LocalDate>();
        for (var row : checkIns.findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), start, today)) {
            if (row.getStatus() != CheckInStatus.COMPLETED
                    || row.getPointsSnapshot() == null || row.getAppliedXp() == null
                    || row.getPointsSnapshot() <= 0) continue;
            periodXp += row.getPointsSnapshot();
            contributingDates.add(row.getDate());
        }

        long companionXp = progress.totals(user.getId()).getXp();
        int stage = CompanionProgression.stageFor(companionXp);
        Long nextThreshold = CompanionProgression.nextThreshold(stage);
        long remaining = nextThreshold == null ? 0 : nextThreshold - companionXp;
        LocalDate estimate = estimate(today, remaining, periodXp, nextThreshold);
        return new Summary(start, today, time.zone(user).getId(), WINDOW_DAYS, periodXp,
                contributingDates.size(), companionXp, stage, nextThreshold, remaining, estimate);
    }

    static LocalDate estimate(LocalDate today, long remaining, long periodXp, Long nextThreshold) {
        if (nextThreshold == null || periodXp <= 0 || remaining <= 0) return null;
        long days = (remaining * WINDOW_DAYS + periodXp - 1) / periodXp;
        return days > MAX_FORECAST_DAYS ? null : today.plusDays(days);
    }
}
