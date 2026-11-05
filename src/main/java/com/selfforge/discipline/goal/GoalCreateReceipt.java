package com.selfforge.discipline.goal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** Records one accepted goal-create request so a network retry cannot create a duplicate. */
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "requestId"}))
public class GoalCreateReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 36)
    private String requestId;

    @Column(nullable = false, length = 64)
    private String fingerprint;

    @Column(nullable = false)
    private Long goalId;

    protected GoalCreateReceipt() {}

    public GoalCreateReceipt(Long userId, String requestId, String fingerprint, Long goalId) {
        this.userId = userId;
        this.requestId = requestId;
        this.fingerprint = fingerprint;
        this.goalId = goalId;
    }

    public String getFingerprint() { return fingerprint; }
    public Long getGoalId() { return goalId; }
}
