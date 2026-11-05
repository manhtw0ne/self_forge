package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "app_user")
public class AppUser {
    private java.time.Instant emailVerifiedAt;
    public void markEmailVerified(java.time.Instant instant) { this.emailVerifiedAt = instant; }
    public java.time.Instant getEmailVerifiedAt() { return emailVerifiedAt; }


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false)
    private String passwordHash;

    private String avatarUrl;

    private String timezone;

    private String motto;

    @Column(length = 8)
    private String language;

    private Instant createdAt;

    private Instant termsAcceptedAt;

    @Column(length = 32)
    private String termsVersion;

    @Enumerated(EnumType.STRING)
    // The default lets Hibernate safely upgrade the legacy local H2 file that
    // predates Premium. PostgreSQL production schemas remain governed by
    // Flyway; application code always sets this field explicitly for new users.
    @Column(nullable = false, columnDefinition = "varchar(255) default 'FREE'")
    private PremiumTier premiumTier = PremiumTier.FREE;

    private Instant premiumExpiresAt;

    protected AppUser() {
    }

    public AppUser(String email, String displayName, String passwordHash) {
        this.email = email;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.timezone = "Asia/Ho_Chi_Minh";
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public String getTimezone() {
        return timezone;
    }

    public String getMotto() {
        return motto;
    }

    public String getLanguage() {
        return language;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getTermsAcceptedAt() { return termsAcceptedAt; }

    public String getTermsVersion() { return termsVersion; }

    public void acceptTerms(String version, Instant acceptedAt) {
        this.termsVersion = version;
        this.termsAcceptedAt = acceptedAt;
    }

    public PremiumTier getPremiumTier() {
        return premiumTier;
    }

    public Instant getPremiumExpiresAt() {
        return premiumExpiresAt;
    }

    /**
     * Returns true if the user has an active premium subscription.
     * LIFETIME users are always premium. PREMIUM users are checked against expiry.
     */
    public boolean isPremium() {
        if (premiumTier == PremiumTier.LIFETIME) return true;
        if (premiumTier == PremiumTier.PREMIUM && premiumExpiresAt != null) {
            return premiumExpiresAt.isAfter(Instant.now());
        }
        return false;
    }

    public void activatePremium(PremiumTier tier, Instant expiresAt) {
        this.premiumTier = tier;
        this.premiumExpiresAt = expiresAt;
    }

    public void deactivatePremium() {
        this.premiumTier = PremiumTier.FREE;
        this.premiumExpiresAt = null;
    }

    public void updateProfile(String displayName, String avatarUrl, String timezone, String motto) {
        if (displayName != null && !displayName.isBlank()) this.displayName = displayName.trim();
        if (avatarUrl != null) this.avatarUrl = avatarUrl;
        if (timezone != null && !timezone.isBlank()) this.timezone = timezone;
        if (motto != null) this.motto = motto;
    }

    /** A nullable preference lets existing users retain their local default until they choose one. */
    public void updateLanguage(String language) {
        this.language = language;
    }

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void updateEmail(String email) {
        this.email = email;
    }
}
