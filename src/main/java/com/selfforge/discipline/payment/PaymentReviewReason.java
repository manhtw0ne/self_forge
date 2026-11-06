package com.selfforge.discipline.payment;

/** Non-sensitive reason a verified provider event was retained for manual reconciliation. */
public enum PaymentReviewReason {
    UNMATCHED_REFERENCE,
    INELIGIBLE_TRANSFER,
    ORDER_NOT_PAYABLE,
    AMOUNT_MISMATCH,
    LIFETIME_ALREADY_ACTIVE
}
