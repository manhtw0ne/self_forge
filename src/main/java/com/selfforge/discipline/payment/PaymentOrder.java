package com.selfforge.discipline.payment;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "payment_order")
public class PaymentOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentOrderStatus status;

    @Column(name = "amount_vnd", nullable = false)
    private long amountVnd;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, unique = true, length = 32)
    private String reference;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "entitlement_expires_at")
    private Instant entitlementExpiresAt;

    protected PaymentOrder() { }

    PaymentOrder(AppUser user, PaymentPlan plan, String reference, Instant createdAt, Instant expiresAt) {
        this.user = user;
        this.plan = plan;
        this.status = PaymentOrderStatus.PENDING;
        this.amountVnd = plan.amountVnd();
        this.currency = "VND";
        this.reference = reference;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public PaymentPlan getPlan() { return plan; }
    public PaymentOrderStatus getStatus() { return status; }
    public long getAmountVnd() { return amountVnd; }
    public String getCurrency() { return currency; }
    public String getReference() { return reference; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getPaidAt() { return paidAt; }
    public Instant getEntitlementExpiresAt() { return entitlementExpiresAt; }

    boolean isPendingAndValidAt(Instant now) {
        return status == PaymentOrderStatus.PENDING && !now.isAfter(expiresAt);
    }

    void markPaid(Instant paidAt, Instant entitlementExpiresAt) {
        if (status != PaymentOrderStatus.PENDING) throw new IllegalStateException("Payment order cannot be paid from its current state");
        this.status = PaymentOrderStatus.PAID;
        this.paidAt = paidAt;
        this.entitlementExpiresAt = entitlementExpiresAt;
    }

    void markReview() {
        if (status == PaymentOrderStatus.PENDING) this.status = PaymentOrderStatus.REVIEW;
    }

    void cancelForPlanChange() {
        if (status == PaymentOrderStatus.PENDING) this.status = PaymentOrderStatus.CANCELLED;
    }
}
