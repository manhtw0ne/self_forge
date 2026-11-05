package com.selfforge.discipline.coach;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Stops accidental rapid repeats while retaining neither the question nor the answer. */
@Component
class HabitCoachRequestLimiter {
    private static final Duration COOLDOWN = Duration.ofMinutes(1);
    private static final Duration RETENTION = Duration.ofDays(2);

    private final Clock clock;
    private final ConcurrentHashMap<Long, Instant> lastRequests = new ConcurrentHashMap<>();

    HabitCoachRequestLimiter(Clock clock) { this.clock = clock; }

    void acquire(Long userId) {
        Instant now = clock.instant();
        lastRequests.entrySet().removeIf(entry -> entry.getValue().isBefore(now.minus(RETENTION)));
        Instant prior = lastRequests.putIfAbsent(userId, now);
        if (prior != null && prior.isAfter(now.minus(COOLDOWN))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Đợi khoảng một phút trước khi gửi câu hỏi khác cho AI Coach.");
        }
        lastRequests.put(userId, now);
    }
}
