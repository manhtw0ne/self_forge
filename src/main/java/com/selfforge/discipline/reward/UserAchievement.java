package com.selfforge.discipline.reward;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "user_achievement", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "achievement_id"}))
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Achievement achievement;

    private Instant earnedAt;

    protected UserAchievement() {
    }

    public UserAchievement(AppUser user, Achievement achievement) {
        this.user = user;
        this.achievement = achievement;
        this.earnedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public Achievement getAchievement() {
        return achievement;
    }

    public Instant getEarnedAt() {
        return earnedAt;
    }
}
