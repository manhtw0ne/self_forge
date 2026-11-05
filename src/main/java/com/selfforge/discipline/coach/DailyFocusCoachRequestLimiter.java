package com.selfforge.discipline.coach;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Prevents rapid repeated provider calls while retaining no planning content. */
@Component
class DailyFocusCoachRequestLimiter {
    private static final Duration COOLDOWN = Duration.ofMinutes(1);
    private static final Duration RETENTION = Duration.ofDays(2);

    private final Clock clock;
    private final ConcurrentHashMap<String, Instant> requests = new ConcurrentHashMap<>();

    DailyFocusCoachRequestLimiter(Clock clock) { this.clock = clock; }

    void acquire(Long userId, LocalDate date) {
        Instant now = clock.instant();
        requests.entrySet().removeIf(entry -> entry.getValue().isBefore(now.minus(RETENTION)));
        String key = userId + ":" + date;
        Instant previous = requests.putIfAbsent(key, now);
        if (previous != null && previous.isAfter(now.minus(COOLDOWN))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Đợi khoảng một phút trước khi xin thêm gợi ý AI cho hôm nay.");
        }
        requests.put(key, now);
    }
}
