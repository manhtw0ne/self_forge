package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import org.springframework.data.domain.Persistable;

/** A durable fixed-window counter used by the public outbound-email limiter. */
@Entity
@Table(name = "email_request_rate_limit")
public class EmailRequestRateLimit implements Persistable<String> {
    @Transient private boolean fresh = true;

    @Id
    @Column(nullable = false, length = 80)
    private String scope;

    @Column(name = "window_start", nullable = false)
    private Instant windowStart;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    protected EmailRequestRateLimit() { }

    public EmailRequestRateLimit(String scope, Instant windowStart) {
        this.scope = scope;
        this.windowStart = windowStart;
    }

    @Override public String getId() { return scope; }
    @Override public boolean isNew() { return fresh; }
    @PostLoad @PostPersist void markPersisted() { fresh = false; }

    public Instant getWindowStart() { return windowStart; }
    public int getAttemptCount() { return attemptCount; }

    public void reset(Instant now) {
        windowStart = now;
        attemptCount = 0;
    }

    public void increment() { attemptCount++; }
}
