package com.selfforge.discipline.pomodoro;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

import java.time.Instant;

@Entity
public class PomodoroSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    private Habit habit;

    private int durationMinutes;

    private boolean completed;

    private String note;

    private Instant startedAt;

    private Instant endedAt;

    protected PomodoroSession() {
    }

    public PomodoroSession(AppUser user, Habit habit, int durationMinutes) {
        this.user = user;
        this.habit = habit;
        this.durationMinutes = durationMinutes;
        this.completed = false;
        this.startedAt = Instant.now();
    }

    public void complete(String note) {
        this.completed = true;
        this.endedAt = Instant.now();
        this.note = note;
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public Habit getHabit() { return habit; }
    public int getDurationMinutes() { return durationMinutes; }
    public boolean isCompleted() { return completed; }
    public String getNote() { return note; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
}
