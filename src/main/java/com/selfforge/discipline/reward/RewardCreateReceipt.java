package com.selfforge.discipline.reward;

import jakarta.persistence.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "requestId"}))
public class RewardCreateReceipt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 36) private String requestId;
    @Column(nullable = false, length = 64) private String fingerprint;
    @Column(nullable = false) private Long rewardId;
    protected RewardCreateReceipt() {}
    public RewardCreateReceipt(Long userId, String requestId, String fingerprint, Long rewardId) {
        this.userId = userId; this.requestId = requestId; this.fingerprint = fingerprint; this.rewardId = rewardId;
    }
    public String getFingerprint() { return fingerprint; }
    public Long getRewardId() { return rewardId; }
}
