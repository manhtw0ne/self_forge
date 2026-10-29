package com.selfforge.discipline.export;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Per-user rate limit for the CSV export endpoint.
 * Allows at most 5 exports per user per 5-minute window, and 60 total per minute globally.
 * This protects against accidental or abusive repeated large data queries.
 */
@Component
public class ExportRateLimiter {

    private final Clock clock;
    private final Map<Long, int[]> userBuckets = new HashMap<>();
    private Instant windowEnd = Instant.MIN;
    private int globalCount;

    public ExportRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public synchronized void acquire(Long userId) {
        Instant now = clock.instant();
        if (!now.isBefore(windowEnd)) {
            userBuckets.clear();
            globalCount = 0;
            windowEnd = now.plusSeconds(300); // 5-minute window
        }
        if (globalCount >= 60) throw new RateLimited();
        int[] count = userBuckets.computeIfAbsent(userId, k -> new int[]{0});
        if (count[0] >= 5) throw new RateLimited();
        count[0]++;
        globalCount++;
    }

    public static class RateLimited extends ResponseStatusException {
        public RateLimited() {
            super(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã xuất dữ liệu quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.");
        }

        @Override
        public HttpHeaders getHeaders() {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Retry-After", "300");
            return headers;
        }
    }
}
