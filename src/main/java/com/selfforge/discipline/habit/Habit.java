package com.selfforge.discipline.habit;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.category.Category;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Column;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

@Entity
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private AppUser user;

    @NotBlank
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    private Difficulty difficulty;

    @Min(1)
    @Max(7)
    private int targetPerWeek;

    @Column(name = "scheduled_days", length = 27)
    private String scheduledDays;

    private int points;

    private boolean active;

    @ManyToOne(fetch = FetchType.LAZY)
    private Category category;

    private String tags;

    private int sortOrder;

    private String stackGroup;

    private Instant createdAt;

    protected Habit() {
    }

    public Habit(AppUser user, String name, String description, Difficulty difficulty, int targetPerWeek, Integer points) {
        this.user = user;
        this.name = name;
        this.description = description;
        this.difficulty = difficulty == null ? Difficulty.MEDIUM : difficulty;
        this.targetPerWeek = targetPerWeek;
        this.scheduledDays = HabitSchedule.defaultFor(targetPerWeek);
        this.points = points == null ? this.difficulty.defaultPoints() : points;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public Habit(AppUser user, String name, String description, Difficulty difficulty, int targetPerWeek, Integer points, Category category, String tags) {
        this(user, name, description, difficulty, targetPerWeek, points);
        this.category = category;
        this.tags = tags;
    }

    public Habit(AppUser user, String name, String description, Difficulty difficulty, int targetPerWeek, Integer points, Category category, String tags, String scheduledDays) {
        this(user, name, description, difficulty, targetPerWeek, points, category, tags);
        this.scheduledDays = HabitSchedule.normalizeOrDefault(scheduledDays, targetPerWeek);
        HabitSchedule.requireMatchesTarget(this.scheduledDays, targetPerWeek);
    }

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public int getTargetPerWeek() {
        return targetPerWeek;
    }

    public String getScheduledDays() {
        return scheduledDays;
    }

    public int getPoints() {
        return points;
    }

    public boolean isActive() {
        return active;
    }

    public Category getCategory() {
        return category;
    }

    public String getTags() {
        return tags;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getStackGroup() {
        return stackGroup;
    }

    public void setStackGroup(String stackGroup) {
        this.stackGroup = stackGroup;
    }

    public void update(String name, String description, Difficulty difficulty, Integer targetPerWeek, Integer points, Boolean active) {
        update(name, description, difficulty, targetPerWeek, points, active, null);
    }

    public void update(String name, String description, Difficulty difficulty, Integer targetPerWeek, Integer points, Boolean active, String scheduledDays) {
        if (name != null && !name.isBlank()) {
            this.name = name;
        }
        if (description != null) {
            this.description = description;
        }
        if (difficulty != null) {
            if (difficulty != this.difficulty && points == null) this.points = difficulty.defaultPoints();
            this.difficulty = difficulty;
        }
        if (targetPerWeek != null) {
            this.targetPerWeek = targetPerWeek;
        }
        if (scheduledDays != null) {
            this.scheduledDays = HabitSchedule.normalizeOrDefault(scheduledDays, this.targetPerWeek);
        } else if (targetPerWeek != null) {
            this.scheduledDays = HabitSchedule.defaultFor(this.targetPerWeek);
        } else if (this.scheduledDays == null) {
            this.scheduledDays = HabitSchedule.defaultFor(this.targetPerWeek);
        }
        HabitSchedule.requireMatchesTarget(this.scheduledDays, this.targetPerWeek);
        if (points != null) {
            this.points = points;
        }
        if (active != null) {
            this.active = active;
        }
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }
}
