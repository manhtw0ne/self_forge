package com.selfforge.discipline.dailyfocus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;

@Entity
@Table(name = "daily_focus_plan", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "plan_date"}))
class DailyFocusPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "user_id", nullable = false) Long userId;
    @Column(name = "plan_date", nullable = false) LocalDate planDate;
    @Column(nullable = false) int budget;
    @Column(nullable = false, length = 10) String energy;
    @Column(name = "habit_ids", nullable = false, length = 64) String habitIds;
    @Column(nullable = false) long revision;

    protected DailyFocusPlan() {}
    DailyFocusPlan(Long userId, LocalDate planDate) { this.userId = userId; this.planDate = planDate; }
}
