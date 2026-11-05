package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "weekly_coach_advice", uniqueConstraints = @UniqueConstraint(
        name = "uq_weekly_coach_advice_snapshot",
        columnNames = { "user_id", "week_start", "language", "evidence_fingerprint" }))
public class WeeklyCoachAdvice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Column(nullable = false, length = 2)
    private String language;

    @Column(name = "evidence_fingerprint", nullable = false, length = 64)
    private String evidenceFingerprint;

    @Column(nullable = false, length = 280)
    private String headline;

    @Column(name = "observations_json", nullable = false, columnDefinition = "TEXT")
    private String observationsJson;

    @Column(name = "experiments_json", nullable = false, columnDefinition = "TEXT")
    private String experimentsJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** Optional, user-controlled beta feedback. It never changes the suggestion or plan. */
    @Column(name = "helpfulness_rating")
    private Integer helpfulnessRating;

    @Enumerated(EnumType.STRING)
    @Column(name = "follow_up_decision", length = 16)
    private WeeklyCoachFeedbackDecision followUpDecision;

    protected WeeklyCoachAdvice() {}

    WeeklyCoachAdvice(AppUser user, LocalDate weekStart, String language, String evidenceFingerprint,
            String headline, String observationsJson, String experimentsJson, Instant createdAt) {
        this.user = user;
        this.weekStart = weekStart;
        this.language = language;
        this.evidenceFingerprint = evidenceFingerprint;
        this.headline = headline;
        this.observationsJson = observationsJson;
        this.experimentsJson = experimentsJson;
        this.createdAt = createdAt;
    }

    String getHeadline() { return headline; }
    String getObservationsJson() { return observationsJson; }
    String getExperimentsJson() { return experimentsJson; }
    Integer getHelpfulnessRating() { return helpfulnessRating; }
    WeeklyCoachFeedbackDecision getFollowUpDecision() { return followUpDecision; }

    void updateFeedback(Integer rating, WeeklyCoachFeedbackDecision decision) {
        if (rating != null) helpfulnessRating = rating;
        if (decision != null) followUpDecision = decision;
    }

    void clearFeedback() {
        helpfulnessRating = null;
        followUpDecision = null;
    }
}
