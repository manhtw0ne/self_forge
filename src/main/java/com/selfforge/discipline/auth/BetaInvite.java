package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A server-managed closed-beta invitation. The usable invitation secret is
 * never stored here; only its SHA-256 digest is persisted.
 */
@Entity
@Table(name = "beta_invite", indexes = @Index(name = "ix_beta_invite_active_expires_at", columnList = "active,expires_at"))
public class BetaInvite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_hash", nullable = false, unique = true, length = 64)
    private String codeHash;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "max_uses", nullable = false)
    private int maxUses;

    @Column(name = "use_count", nullable = false)
    private int useCount;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected BetaInvite() { }

    BetaInvite(String codeHash, String label, int maxUses, Instant expiresAt, Instant createdAt) {
        this.codeHash = codeHash;
        this.label = label;
        this.maxUses = maxUses;
        this.useCount = 0;
        this.active = true;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    boolean canConsume(Instant now) {
        return active && useCount < maxUses && (expiresAt == null || now.isBefore(expiresAt));
    }

    void consume() { useCount++; }

    void revoke(Instant now) {
        if (active) {
            active = false;
            revokedAt = now;
        }
    }

    public Long getId() { return id; }
    public String getCodeHash() { return codeHash; }
    public String getLabel() { return label; }
    public int getMaxUses() { return maxUses; }
    public int getUseCount() { return useCount; }
    public boolean isActive() { return active; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getRevokedAt() { return revokedAt; }
}
