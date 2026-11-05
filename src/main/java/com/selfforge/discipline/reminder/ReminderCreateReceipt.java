package com.selfforge.discipline.reminder;

import jakarta.persistence.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "requestId"}))
public class ReminderCreateReceipt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 36) private String requestId;
    @Column(nullable = false, length = 64) private String fingerprint;
    @Column(nullable = false) private Long reminderId;
    protected ReminderCreateReceipt() {}
    public ReminderCreateReceipt(Long userId, String requestId, String fingerprint, Long reminderId) {
        this.userId = userId; this.requestId = requestId; this.fingerprint = fingerprint; this.reminderId = reminderId;
    }
    public String getFingerprint() { return fingerprint; }
    public Long getReminderId() { return reminderId; }
}
