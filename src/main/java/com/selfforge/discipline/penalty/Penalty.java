package com.selfforge.discipline.penalty;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "penalty")
public class Penalty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    private Habit habit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PenaltyType type;

    private int xpDeducted;

    private String reason;

    @Column(nullable = false)
    private LocalDate date;

    private Instant createdAt;

    private Long checkInId;
    @Column(nullable = false)
    private boolean reversed;

    protected Penalty() {
    }

    public Penalty(AppUser user, Habit habit, PenaltyType type, int xpDeducted, String reason, LocalDate date) {
        this.user = user;
        this.habit = habit;
        this.type = type;
        this.xpDeducted = xpDeducted;
        this.reason = reason;
        this.date = date;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public Habit getHabit() { return habit; }
    public PenaltyType getType() { return type; }
    public int getXpDeducted() { return xpDeducted; }
    public String getReason() { return reason; }
    public LocalDate getDate() { return date; }
    public Instant getCreatedAt() { return createdAt; }
    public void linkCheckIn(Long id) { this.checkInId = id; }
    public boolean isReversed() { return reversed; }
    public void reverse() { this.reversed = true; }
}
