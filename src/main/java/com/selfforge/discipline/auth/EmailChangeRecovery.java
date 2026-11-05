package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.Instant;

/** A one-time recovery proof delivered only to the account's previous email address. */
@Entity
public class EmailChangeRecovery {
    @Id private Long userId;
    @Column(nullable = false, length = 254) private String previousEmail;
    @Column(nullable = false, length = 254) private String changedEmail;
    @Column(nullable = false, length = 64) private String tokenHash;
    @Column(nullable = false) private Instant expiresAt;
    @Column(nullable = false) private boolean consumed;

    protected EmailChangeRecovery() {}

    public EmailChangeRecovery(Long userId, String previousEmail, String changedEmail, String tokenHash, Instant now) {
        this.userId = userId;
        this.previousEmail = previousEmail;
        this.changedEmail = changedEmail;
        this.tokenHash = tokenHash;
        this.expiresAt = now.plusSeconds(24 * 60 * 60);
        this.consumed = false;
    }

    public void replace(String previousEmail, String changedEmail, String tokenHash, Instant now) {
        this.previousEmail = previousEmail;
        this.changedEmail = changedEmail;
        this.tokenHash = tokenHash;
        this.expiresAt = now.plusSeconds(24 * 60 * 60);
        this.consumed = false;
    }

    public boolean usable(Instant now) { return !consumed && now.isBefore(expiresAt); }
    // Keep the fingerprint so the database's unique index remains valid for multiple consumed rows.
    // `usable` rejects it after consumption, and cleanup removes it after expiry.
    public void consume() { consumed = true; }
    public Long getUserId() { return userId; }
    public String getPreviousEmail() { return previousEmail; }
    public String getChangedEmail() { return changedEmail; }
}
