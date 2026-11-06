package com.selfforge.discipline.payment;

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

/**
 * Minimal provider event ledger. It stores no raw transfer description, payer
 * name or bank account; the provider transaction ID supplies replay safety.
 */
@Entity
@Table(name = "payment_event")
public class PaymentEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_order_id")
    private PaymentOrder order;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "external_id", nullable = false, length = 128)
    private String externalId;

    @Column(name = "order_reference", length = 32)
    private String orderReference;

    @Column(name = "amount_vnd", nullable = false)
    private long amountVnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentEventDisposition disposition;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_reason", length = 32)
    private PaymentReviewReason reviewReason;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    protected PaymentEvent() { }

    PaymentEvent(PaymentOrder order, String provider, String externalId, String orderReference,
                 long amountVnd, PaymentEventDisposition disposition, PaymentReviewReason reviewReason,
                 Instant receivedAt) {
        this.order = order;
        this.provider = provider;
        this.externalId = externalId;
        this.orderReference = orderReference;
        this.amountVnd = amountVnd;
        this.disposition = disposition;
        this.reviewReason = reviewReason;
        this.receivedAt = receivedAt;
    }

    public Long getId() { return id; }
    public PaymentOrder getOrder() { return order; }
    public String getProvider() { return provider; }
    public String getExternalId() { return externalId; }
    public String getOrderReference() { return orderReference; }
    public long getAmountVnd() { return amountVnd; }
    public PaymentEventDisposition getDisposition() { return disposition; }
    public PaymentReviewReason getReviewReason() { return reviewReason; }
    public Instant getReceivedAt() { return receivedAt; }
}
