package com.selfforge.discipline.goal;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    private String name;
    private String description;
    private int targetValue;
    private int currentValue;
    private String unit; // "cuốn", "km", "buổi", etc.
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    private GoalStatus status;

    private Instant createdAt;

    protected Goal() {}

    public Goal(AppUser user, String name, String description, int targetValue, String unit, LocalDate deadline) {
        this.user = user;
        this.name = name;
        this.description = description;
        this.targetValue = targetValue;
        this.currentValue = 0;
        this.unit = unit;
        this.deadline = deadline;
        this.status = GoalStatus.ACTIVE;
        this.createdAt = Instant.now();
    }

    public void addProgress(int amount) {
        this.currentValue = Math.min(this.currentValue + amount, this.targetValue);
        if (this.currentValue >= this.targetValue) {
            this.status = GoalStatus.COMPLETED;
        }
    }

    public void update(String name, String description, Integer targetValue, String unit, LocalDate deadline) {
        if (name != null && !name.isBlank()) this.name = name;
        if (description != null) this.description = description;
        if (targetValue != null && targetValue > 0) this.targetValue = targetValue;
        if (unit != null) this.unit = unit;
        if (deadline != null) this.deadline = deadline;
    }

    public void abandon() { this.status = GoalStatus.ABANDONED; }

    public double getProgress() {
        return targetValue == 0 ? 0 : (double) currentValue / targetValue;
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getTargetValue() { return targetValue; }
    public int getCurrentValue() { return currentValue; }
    public String getUnit() { return unit; }
    public LocalDate getDeadline() { return deadline; }
    public GoalStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
