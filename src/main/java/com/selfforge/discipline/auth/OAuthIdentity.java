package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "oauth_identity", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"provider", "provider_subject"}),
        @UniqueConstraint(columnNames = {"provider", "user_id"})
})
class OAuthIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    OAuthProvider provider;
    @Column(nullable = false, length = 255)
    String providerSubject;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    AppUser user;
    @Column(nullable = false)
    Instant createdAt;

    protected OAuthIdentity() {}

    OAuthIdentity(OAuthProvider provider, String providerSubject, AppUser user, Instant createdAt) {
        this.provider = provider;
        this.providerSubject = providerSubject;
        this.user = user;
        this.createdAt = createdAt;
    }
}
