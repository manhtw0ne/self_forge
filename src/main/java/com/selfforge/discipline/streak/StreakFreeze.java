package com.selfforge.discipline.streak;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "habit_id", "freeze_date"}))
public class StreakFreeze {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Habit habit;

    @Column(name = "freeze_date", nullable = false)
    private LocalDate freezeDate;

    private Instant usedAt;

    protected StreakFreeze() {
    }

    public StreakFreeze(AppUser user, Habit habit, LocalDate freezeDate) {
        this(user, habit, freezeDate, Instant.now());
    }

    public StreakFreeze(AppUser user, Habit habit, LocalDate freezeDate, Instant usedAt) {
        this.user = user;
        this.habit = habit;
        this.freezeDate = freezeDate;
        this.usedAt = usedAt;
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public Habit getHabit() { return habit; }
    public LocalDate getFreezeDate() { return freezeDate; }
    public Instant getUsedAt() { return usedAt; }
}
