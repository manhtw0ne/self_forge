package com.selfforge.discipline.coach;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Prevents accidental repeated provider calls without storing a plan or its contents. */
@Component
class GoalCoachRequestLimiter {
    private static final Duration COOLDOWN = Duration.ofMinutes(1);
    private static final Duration RETENTION = Duration.ofDays(7);
    private final Clock clock;
    private final ConcurrentHashMap<String, Instant> lastRequests = new ConcurrentHashMap<>();

    GoalCoachRequestLimiter(Clock clock) {
        this.clock = clock;
    }

    void acquire(Long userId, Long goalId) {
        Instant now = clock.instant();
        lastRequests.entrySet().removeIf(entry -> entry.getValue().isBefore(now.minus(RETENTION)));
        String key = userId + ":" + goalId;
        Instant prior = lastRequests.putIfAbsent(key, now);
        if (prior != null && prior.isAfter(now.minus(COOLDOWN))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Đợi khoảng một phút trước khi xin thêm kế hoạch AI cho mục tiêu này.");
        }
        lastRequests.put(key, now);
    }
}
