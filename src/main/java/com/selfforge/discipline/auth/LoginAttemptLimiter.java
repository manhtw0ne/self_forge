package com.selfforge.discipline.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Durable shared protection for public login and registration endpoints.
 * Production scopes contain a SHA-256 fingerprint rather than the email itself.
 */
@Component
public class LoginAttemptLimiter {
    private static final String GLOBAL_SCOPE = "global";
    private static final String EMAIL_SCOPE_PREFIX = "email:";
    private static final String CLIENT_SCOPE_PREFIX = "client:";

    private final LoginAttemptRateLimitRepository limits;
    private final Clock clock;
    private final long windowSeconds;
    private final int perEmailLimit;
    private final int perClientLimit;
    private final int globalLimit;
    private final long retentionSeconds;

    // Kept only for direct unit tests that intentionally construct the limiter
    // without Spring or a database. The application bean always uses `limits`.
    private final Map<String, Integer> attempts = new HashMap<>();
    private Instant windowEnd = Instant.MIN;
    private int total;

    /** Keeps direct unit tests on the production defaults. */
    public LoginAttemptLimiter(Clock clock) {
        this.limits = null;
        this.clock = clock;
        this.windowSeconds = 60;
        this.perEmailLimit = 10;
        this.perClientLimit = 30;
        this.globalLimit = 120;
        this.retentionSeconds = 7200;
    }

    @Autowired
    public LoginAttemptLimiter(LoginAttemptRateLimitRepository limits, Clock clock,
            @Value("${app.login-attempt-limit.window-seconds:60}") long windowSeconds,
            @Value("${app.login-attempt-limit.per-email-limit:10}") int perEmailLimit,
            @Value("${app.login-attempt-limit.per-client-limit:30}") int perClientLimit,
            @Value("${app.login-attempt-limit.global-limit:120}") int globalLimit,
            @Value("${app.login-attempt-limit.retention-seconds:7200}") long retentionSeconds) {
        if (windowSeconds <= 0 || perEmailLimit <= 0 || perClientLimit <= 0 || globalLimit <= 0 || retentionSeconds < windowSeconds) {
            throw new IllegalArgumentException("Invalid login attempt limit");
        }
        this.limits = limits;
        this.clock = clock;
        this.windowSeconds = windowSeconds;
        this.perEmailLimit = perEmailLimit;
        this.perClientLimit = perClientLimit;
        this.globalLimit = globalLimit;
        this.retentionSeconds = retentionSeconds;
    }

    @Transactional
    public synchronized void acquire(String email) {
        acquire(email, null);
    }

    /**
     * Reserves a login or registration attempt before the credential work runs.
     * The caller supplies only an address already validated by ClientAddressResolver;
     * this class hashes it before any database write.
     */
    @Transactional
    public synchronized void acquire(String email, String clientAddress) {
        if (limits == null) {
            acquireInMemory(email, clientAddress);
            return;
        }
        Instant now = clock.instant();
        LoginAttemptRateLimit global = limits.lockByScope(GLOBAL_SCOPE)
                .orElseGet(() -> limits.saveAndFlush(new LoginAttemptRateLimit(GLOBAL_SCOPE, now)));
        if (expired(global, now)) {
            global.reset(now);
            limits.deleteExpiredScopedBuckets(now.minusSeconds(retentionSeconds));
        }

        String scope = emailScope(normalize(email));
        LoginAttemptRateLimit perEmail = limits.lockByScope(scope)
                .orElseGet(() -> new LoginAttemptRateLimit(scope, now));
        if (expired(perEmail, now)) perEmail.reset(now);
        String clientScope = clientScope(clientAddress);
        LoginAttemptRateLimit perClient = clientScope == null ? null : limits.lockByScope(clientScope)
                .orElseGet(() -> new LoginAttemptRateLimit(clientScope, now));
        if (perClient != null && expired(perClient, now)) perClient.reset(now);
        if (global.getAttemptCount() >= globalLimit || perEmail.getAttemptCount() >= perEmailLimit
                || (perClient != null && perClient.getAttemptCount() >= perClientLimit)) {
            throw new RateLimited(windowSeconds);
        }
        global.increment();
        perEmail.increment();
        if (perClient != null) perClient.increment();
        limits.saveAndFlush(global);
        limits.saveAndFlush(perEmail);
        if (perClient != null) limits.saveAndFlush(perClient);
    }

    private void acquireInMemory(String email, String clientAddress) {
        Instant now = clock.instant();
        if (!now.isBefore(windowEnd)) {
            attempts.clear();
            total = 0;
            windowEnd = now.plusSeconds(windowSeconds);
        }
        String key = normalize(email);
        int emailCount = attempts.getOrDefault(key, 0);
        String clientScope = clientScope(clientAddress);
        int clientCount = clientScope == null ? 0 : attempts.getOrDefault(clientScope, 0);
        if (total >= globalLimit || emailCount >= perEmailLimit
                || (clientScope != null && clientCount >= perClientLimit)) {
            throw new RateLimited(windowSeconds);
        }
        total++;
        attempts.put(key, emailCount + 1);
        if (clientScope != null) attempts.put(clientScope, clientCount + 1);
    }

    private boolean expired(LoginAttemptRateLimit bucket, Instant now) {
        return !now.isBefore(bucket.getWindowStart().plusSeconds(windowSeconds));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String emailScope(String email) {
        return scope(EMAIL_SCOPE_PREFIX, email);
    }

    private static String clientScope(String clientAddress) {
        if (clientAddress == null || clientAddress.isBlank()) return null;
        return scope(CLIENT_SCOPE_PREFIX, clientAddress.trim());
    }

    private static String scope(String prefix, String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return prefix + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException unavailable) {
            throw new IllegalStateException("SHA-256 is unavailable", unavailable);
        }
    }

    public static class RateLimited extends ResponseStatusException {
        private final long retryAfterSeconds;

        public RateLimited(long retryAfterSeconds) {
            super(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi một phút rồi thử lại.");
            this.retryAfterSeconds = retryAfterSeconds;
        }

        @Override public org.springframework.http.HttpHeaders getHeaders() {
            var headers = new org.springframework.http.HttpHeaders();
            headers.set("Retry-After", Long.toString(retryAfterSeconds));
            return headers;
        }
    }
}
