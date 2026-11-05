package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

/** Validated AI output kept without duplicating the goal text used to create its fingerprint. */
@Entity
@Table(name = "goal_coach_plan", uniqueConstraints = @UniqueConstraint(
        name = "uq_goal_coach_plan_snapshot",
        columnNames = { "user_id", "goal_id", "language", "evidence_fingerprint" }))
public class GoalCoachPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "goal_id", nullable = false)
    private Long goalId;

    @Column(nullable = false, length = 2)
    private String language;

    @Column(name = "evidence_fingerprint", nullable = false, length = 64)
    private String evidenceFingerprint;

    @Column(nullable = false, length = 280)
    private String headline;

    @Column(name = "steps_json", nullable = false, columnDefinition = "TEXT")
    private String stepsJson;

    @Column(name = "habits_json", nullable = false, columnDefinition = "TEXT")
    private String habitsJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected GoalCoachPlan() {}

    GoalCoachPlan(AppUser user, Long goalId, String language, String evidenceFingerprint,
            String headline, String stepsJson, String habitsJson, Instant createdAt) {
        this.user = user;
        this.goalId = goalId;
        this.language = language;
        this.evidenceFingerprint = evidenceFingerprint;
        this.headline = headline;
        this.stepsJson = stepsJson;
        this.habitsJson = habitsJson;
        this.createdAt = createdAt;
    }

    String getHeadline() { return headline; }
    String getStepsJson() { return stepsJson; }
    String getHabitsJson() { return habitsJson; }
}
