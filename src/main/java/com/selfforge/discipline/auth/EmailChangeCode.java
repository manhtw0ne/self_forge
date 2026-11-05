package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.Instant;

/** A single, short-lived proof that the account holder controls a proposed new address. */
@Entity
public class EmailChangeCode {
    @Id private Long userId;
    @Column(nullable = false, length = 254) private String pendingEmail;
    @Column(length = 255) private String codeHash;
    private Instant expiresAt;
    private Instant sentAt;
    private Instant windowStart;
    private int sendCount;
    private int attempts;
    private boolean consumed;

    protected EmailChangeCode() {}
    public EmailChangeCode(Long userId, String pendingEmail) { this.userId = userId; this.pendingEmail = pendingEmail; }

    public boolean canSend(Instant now) {
        return (sentAt == null || !now.isBefore(sentAt.plusSeconds(60)))
                && (windowStart == null || !now.isBefore(windowStart.plusSeconds(3600)) || sendCount < 3);
    }
    public void issue(String hash, Instant now) {
        if (windowStart == null || !now.isBefore(windowStart.plusSeconds(3600))) { windowStart = now; sendCount = 0; }
        codeHash = hash; sentAt = now; expiresAt = now.plusSeconds(600); sendCount++; attempts = 0; consumed = false;
    }
    public boolean usable(Instant now) { return !consumed && codeHash != null && expiresAt != null && now.isBefore(expiresAt) && attempts < 5; }
    public void failedAttempt() { attempts++; }
    public void consume() { consumed = true; codeHash = null; }
    public String getPendingEmail() { return pendingEmail; }
    public String getCodeHash() { return codeHash; }
}
