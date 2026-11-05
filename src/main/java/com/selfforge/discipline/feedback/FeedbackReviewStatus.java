package com.selfforge.discipline.feedback;

/** Internal operator workflow only; it is deliberately never returned to the submitting user. */
public enum FeedbackReviewStatus {
    NEW,
    REVIEWED,
    PLANNED,
    RESOLVED,
    NOT_ACTIONED
}
