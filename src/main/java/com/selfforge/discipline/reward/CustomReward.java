package com.selfforge.discipline.reward;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

import java.time.Instant;

@Entity
public class CustomReward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    private String name;
    private String description;
    private int xpCost;
    private boolean claimed;
    private Instant createdAt;
    private Instant claimedAt;

    protected CustomReward() {}

    public CustomReward(AppUser user, String name, String description, int xpCost) {
        this.user = user;
        this.name = name;
        this.description = description;
        this.xpCost = xpCost;
        this.claimed = false;
        this.createdAt = Instant.now();
    }

    public void claim() {
        this.claimed = true;
        this.claimedAt = Instant.now();
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getXpCost() { return xpCost; }
    public boolean isClaimed() { return claimed; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getClaimedAt() { return claimedAt; }

    public void update(String name, String description, Integer xpCost) {
        if (name != null && !name.isBlank()) this.name = name;
        if (description != null) this.description = description;
        if (xpCost != null && xpCost > 0) this.xpCost = xpCost;
    }
}
