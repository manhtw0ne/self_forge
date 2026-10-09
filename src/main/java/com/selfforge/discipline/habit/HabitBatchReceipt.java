package com.selfforge.discipline.habit;
import jakarta.persistence.*;
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "requestId"}))
public class HabitBatchReceipt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 36) private String requestId;
    @Column(nullable = false, length = 64) private String fingerprint;
    @Column(nullable = false, length = 255) private String habitIds;
    protected HabitBatchReceipt() {}
    public HabitBatchReceipt(Long userId, String requestId, String fingerprint, String habitIds) {
        this.userId = userId; this.requestId = requestId; this.fingerprint = fingerprint; this.habitIds = habitIds;
    }
    public String getFingerprint() { return fingerprint; }
    public String getHabitIds() { return habitIds; }
}
