package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.Instant;

@Entity
class OAuthNativeHandoff {
    @Id
    @Column(nullable = false, length = 64)
    String handoffHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    AppUser user;

    @Column(nullable = false)
    Instant expiresAt;

    @Column(nullable = false)
    Instant createdAt;

    protected OAuthNativeHandoff() {}

    OAuthNativeHandoff(String handoffHash, Instant expiresAt, Instant createdAt) {
        this.handoffHash = handoffHash;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    void complete(AppUser user) {
        this.user = user;
    }
}
