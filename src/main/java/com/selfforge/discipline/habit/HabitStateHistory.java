package com.selfforge.discipline.habit;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

/** Observed facts about a habit's schedule; never inferred dates from before recording began. */
@Entity
public class HabitStateHistory {
    public enum Kind { CREATED, OBSERVED, CHANGED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Habit habit;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private Kind kind;
    @Column(nullable = false)
    private int targetPerWeek;
    @Column(name = "scheduled_days", length = 27)
    private String scheduledDays;
    @Column(nullable = false)
    private boolean active;
    @Column(nullable = false)
    private Instant recordedAt;
    @Column(nullable = false)
    private LocalDate calendarDate;
    @Column(nullable = false, length = 64)
    private String timezone;

    protected HabitStateHistory() {}

    HabitStateHistory(Habit habit, Kind kind, int targetPerWeek, String scheduledDays, boolean active,
                      java.time.ZonedDateTime now) {
        this.habit = habit;
        this.kind = kind;
        this.targetPerWeek = targetPerWeek;
        this.scheduledDays = HabitSchedule.normalizeOrDefault(scheduledDays, targetPerWeek);
        this.active = active;
        this.recordedAt = now.toInstant();
        this.calendarDate = now.toLocalDate();
        this.timezone = now.getZone().getId();
    }

    public Long getId() { return id; }
    public Long getHabitId() { return habit.getId(); }
    public Kind getKind() { return kind; }
    public int getTargetPerWeek() { return targetPerWeek; }
    public String getScheduledDays() { return scheduledDays; }
    public boolean isActive() { return active; }
    public Instant getRecordedAt() { return recordedAt; }
    public LocalDate getCalendarDate() { return calendarDate; }
    public String getTimezone() { return timezone; }
}
