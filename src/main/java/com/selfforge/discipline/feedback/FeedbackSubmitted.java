package com.selfforge.discipline.feedback;

import java.time.Instant;

/** Immutable, already-sanitized report data emitted only after it has been persisted. */
record FeedbackSubmitted(long id, FeedbackType type, String summary, String steps, String expected,
                         String language, Instant createdAt) {
    static FeedbackSubmitted from(FeedbackSubmission feedback) {
        return new FeedbackSubmitted(feedback.getId(), feedback.getType(), feedback.getSummary(), feedback.getSteps(),
                feedback.getExpected(), feedback.getLanguage(), feedback.getCreatedAt());
    }
}
