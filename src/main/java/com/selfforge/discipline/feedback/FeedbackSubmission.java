package com.selfforge.discipline.feedback;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** A deliberately small user-approved beta report; no journal or activity data is copied here. */
@Entity
@Table(name = "feedback_submission", indexes = {
        @Index(name = "ix_feedback_submission_user_id_id", columnList = "user_id,id"),
        @Index(name = "ix_feedback_submission_user_created_at", columnList = "user_id,created_at")
})
public class FeedbackSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "feedback_type", nullable = false, length = 16)
    private FeedbackType type;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String steps;

    @Column(name = "expected_result", nullable = false, columnDefinition = "TEXT")
    private String expected;

    @Column(nullable = false, length = 2)
    private String language;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "operator_status", nullable = false, length = 16)
    private FeedbackReviewStatus operatorStatus = FeedbackReviewStatus.NEW;

    @Column(name = "operator_note", nullable = false, length = 500)
    private String operatorNote = "";

    @Column(name = "operator_updated_at")
    private Instant operatorUpdatedAt;

    protected FeedbackSubmission() { }

    FeedbackSubmission(AppUser user, FeedbackType type, String summary, String steps,
                       String expected, String language, Instant createdAt) {
        this.user = user;
        this.type = type;
        this.summary = summary;
        this.steps = steps;
        this.expected = expected;
        this.language = language;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Long getUserId() { return user.getId(); }
    public FeedbackType getType() { return type; }
    public String getSummary() { return summary; }
    public String getSteps() { return steps; }
    public String getExpected() { return expected; }
    public String getLanguage() { return language; }
    public Instant getCreatedAt() { return createdAt; }
    public FeedbackReviewStatus getOperatorStatus() { return operatorStatus; }
    public String getOperatorNote() { return operatorNote; }
    public Instant getOperatorUpdatedAt() { return operatorUpdatedAt; }

    public void review(FeedbackReviewStatus status, String note, Instant updatedAt) {
        this.operatorStatus = status;
        this.operatorNote = note;
        this.operatorUpdatedAt = updatedAt;
    }
}
