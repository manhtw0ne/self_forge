package com.selfforge.discipline.goal;

import jakarta.persistence.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"goal_id", "request_key"}))
public class GoalProgressReceipt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "goal_id", nullable = false)
    private Long goalId;
    @Column(name = "request_key", nullable = false, length = 36)
    private String requestKey;
    @Column(nullable = false)
    private int amount;

    protected GoalProgressReceipt() {}
    public GoalProgressReceipt(Long goalId, String requestKey, int amount) {
        this.goalId = goalId;
        this.requestKey = requestKey;
        this.amount = amount;
    }
    public int getAmount() { return amount; }
}