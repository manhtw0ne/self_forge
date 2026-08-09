package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "app_user")
public class AppUser {

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

    private Instant createdAt;

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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void updateProfile(String displayName, String avatarUrl, String timezone, String motto) {
        if (displayName != null && !displayName.isBlank()) this.displayName = displayName.trim();
        if (avatarUrl != null) this.avatarUrl = avatarUrl;
        if (timezone != null && !timezone.isBlank()) this.timezone = timezone;
        if (motto != null) this.motto = motto;
    }

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
