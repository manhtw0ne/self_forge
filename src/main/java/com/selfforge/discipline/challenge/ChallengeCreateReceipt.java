package com.selfforge.discipline.challenge;

import jakarta.persistence.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "requestId"}))
public class ChallengeCreateReceipt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 36) private String requestId;
    @Column(nullable = false, length = 64) private String fingerprint;
    @Column(nullable = false) private Long challengeId;
    protected ChallengeCreateReceipt() {}
    public ChallengeCreateReceipt(Long userId, String requestId, String fingerprint, Long challengeId) {
        this.userId = userId; this.requestId = requestId; this.fingerprint = fingerprint; this.challengeId = challengeId;
    }
    public String getFingerprint() { return fingerprint; }
    public Long getChallengeId() { return challengeId; }
}
