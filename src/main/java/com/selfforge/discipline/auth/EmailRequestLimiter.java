package com.selfforge.discipline.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Durable shared budget for endpoints that can trigger an outbound email.
 *
 * The locked global row makes the fixed window consistent across application
 * instances. Per-address and per-client rows are keyed only by a SHA-256
 * fingerprint, so this abuse-control table never introduces a plaintext
 * email address or network address.
 */
@Component
public class EmailRequestLimiter {
    private static final String GLOBAL_SCOPE = "global";
    private static final String EMAIL_SCOPE_PREFIX = "email:";
    private static final String CLIENT_SCOPE_PREFIX = "client:";

    private final EmailRequestRateLimitRepository limits;
    private final Clock clock;
    private final long windowSeconds;
    private final int perEmailLimit;
    private final int globalLimit;
    private final int perClientLimit;
    private final long retentionSeconds;

    public EmailRequestLimiter(EmailRequestRateLimitRepository limits, Clock clock,
            @Value("${app.email-request-limit.window-seconds:60}") long windowSeconds,
            @Value("${app.email-request-limit.per-email-limit:3}") int perEmailLimit,
            @Value("${app.email-request-limit.global-limit:30}") int globalLimit,
            @Value("${app.email-request-limit.per-client-limit:8}") int perClientLimit,
            @Value("${app.email-request-limit.retention-seconds:7200}") long retentionSeconds) {
        if (windowSeconds <= 0 || perEmailLimit <= 0 || globalLimit <= 0 || perClientLimit <= 0
                || retentionSeconds < windowSeconds) {
            throw new IllegalArgumentException("Invalid email request rate-limit configuration");
        }
        this.limits = limits;
        this.clock = clock;
        this.windowSeconds = windowSeconds;
        this.perEmailLimit = perEmailLimit;
        this.globalLimit = globalLimit;
        this.perClientLimit = perClientLimit;
        this.retentionSeconds = retentionSeconds;
    }

    /**
     * The local monitor makes direct callers safe too; the database row lock is
     * what coordinates production instances.
     */
    @Transactional
    public synchronized void acquire(String email) {
        acquire(email, null);
    }

    /**
     * Acquires every budget before mail work begins. The client value is never
     * stored directly: it is only converted to a keyed one-way scope.
     */
    @Transactional
    public synchronized void acquire(String email, String clientAddress) {
        Instant now = clock.instant();
        EmailRequestRateLimit global = limits.lockByScope(GLOBAL_SCOPE)
                .orElseGet(() -> limits.saveAndFlush(new EmailRequestRateLimit(GLOBAL_SCOPE, now)));
        if (expired(global, now)) {
            global.reset(now);
            limits.deleteExpiredScopedBuckets(now.minusSeconds(retentionSeconds));
        }

        String scope = emailScope(normalize(email));
        EmailRequestRateLimit perEmail = limits.lockByScope(scope)
                .orElseGet(() -> new EmailRequestRateLimit(scope, now));
        if (expired(perEmail, now)) perEmail.reset(now);

        EmailRequestRateLimit perClient = null;
        if (clientAddress != null && !clientAddress.isBlank()) {
            String clientScope = clientScope(clientAddress);
            perClient = limits.lockByScope(clientScope).orElseGet(() -> new EmailRequestRateLimit(clientScope, now));
            if (expired(perClient, now)) perClient.reset(now);
        }

        if (perEmail.getAttemptCount() >= perEmailLimit || global.getAttemptCount() >= globalLimit
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

    private boolean expired(EmailRequestRateLimit bucket, Instant now) {
        return !now.isBefore(bucket.getWindowStart().plusSeconds(windowSeconds));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String emailScope(String email) {
        return hashedScope(EMAIL_SCOPE_PREFIX, email);
    }

    private static String clientScope(String clientAddress) {
        return hashedScope(CLIENT_SCOPE_PREFIX, clientAddress);
    }

    private static String hashedScope(String prefix, String value) {
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
            super(HttpStatus.TOO_MANY_REQUESTS, "Yêu cầu email quá nhiều. Vui lòng đợi một phút rồi thử lại.");
            this.retryAfterSeconds = retryAfterSeconds;
        }
        @Override public HttpHeaders getHeaders() {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Retry-After", Long.toString(retryAfterSeconds));
            return headers;
        }
    }
}
