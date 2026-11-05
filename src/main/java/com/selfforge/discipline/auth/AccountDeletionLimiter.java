package com.selfforge.discipline.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AccountDeletionLimiter {
    private final Clock clock;
    private final Map<Long, Integer> attempts = new HashMap<>();
    private Instant windowEnd = Instant.MIN;
    private int total;

    public AccountDeletionLimiter(Clock clock) { this.clock = clock; }

    public synchronized void acquire(Long userId) {
        Instant now = clock.instant();
        if (!now.isBefore(windowEnd)) {
            attempts.clear(); total = 0; windowEnd = now.plusSeconds(60);
        }
        int count = attempts.getOrDefault(userId, 0);
        if (count >= 5 || total >= 30) throw new Limited();
        attempts.put(userId, count + 1); total++;
    }

    private static class Limited extends ResponseStatusException {
        Limited() { super(HttpStatus.TOO_MANY_REQUESTS, "Yêu cầu xóa tài khoản quá nhiều. Vui lòng đợi một phút rồi thử lại."); }
        @Override public HttpHeaders getHeaders() {
            HttpHeaders headers = new HttpHeaders(); headers.set("Retry-After", "60"); return headers;
        }
    }
}
