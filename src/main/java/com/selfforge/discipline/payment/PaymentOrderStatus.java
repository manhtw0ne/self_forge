package com.selfforge.discipline.payment;

/** Payment review state is deliberately separate from the account entitlement. */
public enum PaymentOrderStatus {
    PENDING,
    PAID,
    EXPIRED,
    CANCELLED,
    REVIEW,
    REFUNDED
}
