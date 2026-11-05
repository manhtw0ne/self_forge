package com.selfforge.discipline.checkin;

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
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"habit_id", "check_date"}))
public class DailyCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Habit habit;

    @Column(name = "check_date", nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    private CheckInStatus status;

    private String note;

    private Instant createdAt;

    // Nullable for legacy records: their original reward cannot safely be inferred.
    private Integer pointsSnapshot;
    private Integer failurePointsSnapshot;
    private Integer appliedXp;

    // Null for legacy check-ins: their original weekly schedule is unknown.
    private Integer targetPerWeekSnapshot;

    // Null for records created before weekday schedules were introduced.
    @Column(name = "scheduled_days_snapshot", length = 27)
    private String scheduledDaysSnapshot;

    protected DailyCheckIn() {
    }

    public DailyCheckIn(Habit habit, LocalDate date, CheckInStatus status, String note) {
        this(habit, date, status, note, habit.getTargetPerWeek(), habit.getScheduledDays());
    }

    DailyCheckIn(Habit habit, LocalDate date, CheckInStatus status, String note,
                 int target, String scheduledDays) {
        this.habit = habit;
        this.date = date;
        this.status = status;
        this.note = note;
        this.createdAt = Instant.now();
        this.targetPerWeekSnapshot = target >= 1 && target <= 7 ? target : null;
        this.scheduledDaysSnapshot = scheduledDays;
    }

    public Long getId() {
        return id;
    }

    public Habit getHabit() {
        return habit;
    }

    public LocalDate getDate() {
        return date;
    }

    public CheckInStatus getStatus() {
        return status;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isCompleted() {
        return status == CheckInStatus.COMPLETED;
    }

    public int scoreImpact() {
        int points = pointsSnapshot != null ? pointsSnapshot : habit.getPoints();
        if (status == CheckInStatus.COMPLETED) {
            return points;
        }
        if (status == CheckInStatus.FAILED) {
            return -Math.max(1, points / 2);
        }
        return 0;
    }

    public void update(CheckInStatus status, String note) {
        this.status = status;
        this.note = note;
    }

    public void initializeAccounting(int points, int failurePoints) {
        this.pointsSnapshot = points;
        this.failurePointsSnapshot = failurePoints;
        this.appliedXp = 0;
    }

    public Integer getPointsSnapshot() { return pointsSnapshot; }
    public Integer getFailurePointsSnapshot() { return failurePointsSnapshot; }
    public Integer getAppliedXp() { return appliedXp; }
    public Integer getTargetPerWeekSnapshot() { return targetPerWeekSnapshot; }
    public String getScheduledDaysSnapshot() { return scheduledDaysSnapshot; }
    public void setAppliedXp(int appliedXp) { this.appliedXp = appliedXp; }
}
