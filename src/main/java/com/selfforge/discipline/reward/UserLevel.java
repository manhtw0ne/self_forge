package com.selfforge.discipline.reward;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_level")
public class UserLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    private int totalXp;

    private int level;

    private int currentLevelXp;

    private int nextLevelXp;

    protected UserLevel() {
    }

    public UserLevel(AppUser user) {
        this.user = user;
        this.totalXp = 0;
        this.level = 1;
        this.currentLevelXp = 0;
        this.nextLevelXp = computeNextLevelXp(1);
    }

    public void addXp(int amount) {
        this.totalXp += amount;
        this.currentLevelXp += amount;
        while (this.currentLevelXp >= this.nextLevelXp) {
            this.currentLevelXp -= this.nextLevelXp;
            this.level++;
            this.nextLevelXp = computeNextLevelXp(this.level);
        }
    }

    public void deductXp(int amount) {
        this.totalXp = Math.max(0, this.totalXp - amount);
        // Recalculate level from totalXp
        this.level = 1;
        int remaining = this.totalXp;
        int needed = computeNextLevelXp(1);
        while (remaining >= needed) {
            remaining -= needed;
            this.level++;
            needed = computeNextLevelXp(this.level);
        }
        this.currentLevelXp = remaining;
        this.nextLevelXp = needed;
    }

    private static int computeNextLevelXp(int level) {
        return (int) Math.round(100 * Math.pow(level, 1.5));
    }

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public int getTotalXp() {
        return totalXp;
    }

    public int getLevel() {
        return level;
    }

    public int getCurrentLevelXp() {
        return currentLevelXp;
    }

    public int getNextLevelXp() {
        return nextLevelXp;
    }
}
