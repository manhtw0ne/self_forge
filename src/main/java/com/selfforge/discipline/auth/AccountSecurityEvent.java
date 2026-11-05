package com.selfforge.discipline.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "account_security_event", indexes = @Index(name = "idx_account_security_event_user_id_id", columnList = "user_id,id"))
public class AccountSecurityEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private AccountSecurityEventType eventType;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected AccountSecurityEvent() {}

    public AccountSecurityEvent(Long userId, AccountSecurityEventType eventType, Instant occurredAt) {
        this.userId = userId;
        this.eventType = eventType;
        this.occurredAt = occurredAt;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public AccountSecurityEventType getEventType() { return eventType; }
    public Instant getOccurredAt() { return occurredAt; }
}
