package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.Instant;

@Entity
class OAuthLoginState {
    @Id
    @Column(nullable = false, length = 64)
    String stateHash;
    @Column(nullable = false, length = 16)
    String provider;
    @Column(length = 128)
    String codeVerifier;
    @Column(nullable = false, length = 1024)
    String returnPath;
    @Column(length = 64)
    String nativeHandoffHash;
    @Column(nullable = false)
    boolean termsAccepted;
    @Column(nullable = false)
    Instant expiresAt;
    @Column(nullable = false)
    Instant createdAt;

    protected OAuthLoginState() {}

    OAuthLoginState(String stateHash, OAuthProvider provider, String codeVerifier, String returnPath, String nativeHandoffHash,
            boolean termsAccepted, Instant expiresAt, Instant createdAt) {
        this.stateHash = stateHash;
        this.provider = provider.name();
        this.codeVerifier = codeVerifier;
        this.returnPath = returnPath;
        this.nativeHandoffHash = nativeHandoffHash;
        this.termsAccepted = termsAccepted;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }
}
