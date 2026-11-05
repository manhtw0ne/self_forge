package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.Instant;

@Entity
class OAuthLoginTicket {
    @Id
    @Column(nullable = false, length = 64)
    String ticketHash;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    AppUser user;
    @Column(nullable = false)
    Instant expiresAt;
    @Column(nullable = false)
    Instant createdAt;

    protected OAuthLoginTicket() {}

    OAuthLoginTicket(String ticketHash, AppUser user, Instant expiresAt, Instant createdAt) {
        this.ticketHash = ticketHash;
        this.user = user;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }
}
