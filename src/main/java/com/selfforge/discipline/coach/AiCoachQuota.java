package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Persistent monthly limits so enabling an AI provider cannot create unbounded costs. */
@Component
public class AiCoachQuota {
    public record Status(int limit, int used, int remaining) {}

    private final AiCoachUsageRepository usage;
    private final AppUserRepository users;
    private final Clock clock;
    private final int weeklyLimit;
    private final int goalLimit;
    private final int restartLimit;
    private final int journalLimit;
    private final int dailyFocusLimit;
    private final int chatLimit;

    public AiCoachQuota(AiCoachUsageRepository usage, AppUserRepository users, Clock clock,
            @Value("${app.ai.weekly.monthly-limit:4}") int weeklyLimit,
            @Value("${app.ai.goal.monthly-limit:3}") int goalLimit,
            @Value("${app.ai.restart.monthly-limit:3}") int restartLimit,
            @Value("${app.ai.journal.monthly-limit:4}") int journalLimit,
            @Value("${app.ai.daily-focus.monthly-limit:3}") int dailyFocusLimit,
            @Value("${app.ai.chat.monthly-limit:3}") int chatLimit) {
        this.usage = usage;
        this.users = users;
        this.clock = clock;
        this.weeklyLimit = bounded(weeklyLimit);
        this.goalLimit = bounded(goalLimit);
        this.restartLimit = bounded(restartLimit);
        this.journalLimit = bounded(journalLimit);
        this.dailyFocusLimit = bounded(dailyFocusLimit);
        this.chatLimit = bounded(chatLimit);
    }

    public Status status(AppUser user, AiCoachFeature feature) {
        LocalDate month = month();
        int used = usage.findByUserIdAndUsageMonthAndFeature(user.getId(), month, feature)
                .map(AiCoachUsage::getRequestCount).orElse(0);
        return status(feature, used);
    }

    /** Counts a provider attempt before sending it, so timeouts cannot be used to bypass the budget. */
    @Transactional
    public Status consume(AppUser user, AiCoachFeature feature) {
        LocalDate month = month();
        // Serialize first-time monthly-row creation across application instances too.
        AppUser locked = users.lockById(user.getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        AiCoachUsage row = usage.findByUserIdAndUsageMonthAndFeature(locked.getId(), month, feature)
                .orElseGet(() -> new AiCoachUsage(locked, month, feature));
        Status before = status(feature, row.getRequestCount());
        if (before.remaining() < 1) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã dùng hết lượt gợi ý AI trong tháng này.");
        }
        row.increment();
        usage.save(row);
        return status(feature, row.getRequestCount());
    }

    private LocalDate month() {
        return YearMonth.now(clock).atDay(1);
    }

    private Status status(AiCoachFeature feature, int used) {
        int limit = switch (feature) {
            case WEEKLY -> weeklyLimit;
            case GOAL -> goalLimit;
            case RESTART -> restartLimit;
            case JOURNAL -> journalLimit;
            case DAILY_FOCUS -> dailyFocusLimit;
            case CHAT -> chatLimit;
        };
        return new Status(limit, used, Math.max(0, limit - used));
    }

    private static int bounded(int value) {
        return Math.max(0, Math.min(value, 100));
    }
}
