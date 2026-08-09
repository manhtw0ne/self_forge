package com.selfforge.discipline.reminder;

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

import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "reminder")
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Habit habit;

    @Column(nullable = false)
    private LocalTime reminderTime;

    @Column(nullable = false)
    private String daysOfWeek; // comma-separated: "MON,TUE,WED,THU,FRI,SAT,SUN"

    private String message;

    private boolean enabled;

    private Instant createdAt;

    protected Reminder() {
    }

    public Reminder(AppUser user, Habit habit, LocalTime reminderTime, String daysOfWeek, String message) {
        this.user = user;
        this.habit = habit;
        this.reminderTime = reminderTime;
        this.daysOfWeek = daysOfWeek == null ? "MON,TUE,WED,THU,FRI,SAT,SUN" : daysOfWeek;
        this.message = message;
        this.enabled = true;
        this.createdAt = Instant.now();
    }

    public void update(LocalTime reminderTime, String daysOfWeek, String message, Boolean enabled) {
        if (reminderTime != null) this.reminderTime = reminderTime;
        if (daysOfWeek != null) this.daysOfWeek = daysOfWeek;
        if (message != null) this.message = message;
        if (enabled != null) this.enabled = enabled;
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public Habit getHabit() { return habit; }
    public LocalTime getReminderTime() { return reminderTime; }
    public String getDaysOfWeek() { return daysOfWeek; }
    public String getMessage() { return message; }
    public boolean isEnabled() { return enabled; }
    public Instant getCreatedAt() { return createdAt; }
}
