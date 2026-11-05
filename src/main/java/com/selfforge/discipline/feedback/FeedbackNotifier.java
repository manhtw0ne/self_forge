package com.selfforge.discipline.feedback;

import com.selfforge.discipline.auth.PasswordResetMail;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Optional operator notice for the small beta; saved feedback remains authoritative. */
@Component
public class FeedbackNotifier {
    private static final Logger log = LoggerFactory.getLogger(FeedbackNotifier.class);
    private final PasswordResetMail mail;
    private final String recipient;

    public FeedbackNotifier(PasswordResetMail mail, @Value("${app.feedback.notify-to:}") String recipient) {
        this.mail = mail;
        this.recipient = recipient == null ? "" : recipient.trim();
        if (!this.recipient.isEmpty() && (this.recipient.length() > 254 || !this.recipient.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))) {
            throw new IllegalArgumentException("Invalid beta feedback notification recipient");
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notifyAfterCommit(FeedbackSubmitted feedback) {
        if (recipient.isEmpty() || !mail.operationalAvailable()) return;
        try {
            mail.sendOperational(recipient, "SelfForge beta feedback #" + feedback.id() + " — " + feedback.type(), body(feedback));
        } catch (RuntimeException ignored) {
            // A report has already committed. Do not expose provider details or claim it was not received.
            log.warn("Beta feedback notification could not be delivered for report {} ({})", feedback.id(), feedback.type());
        }
    }

    private static String body(FeedbackSubmitted feedback) {
        return "A beta participant explicitly submitted this report.\n\n"
                + "Report ID: " + feedback.id() + "\n"
                + "Type: " + feedback.type() + "\n"
                + "Display language: " + feedback.language() + "\n"
                + "Submitted at: " + DateTimeFormatter.ISO_INSTANT.format(feedback.createdAt()) + "\n\n"
                + "Summary:\n" + feedback.summary() + "\n\n"
                + "Steps:\n" + feedback.steps() + "\n\n"
                + "Expected:\n" + feedback.expected();
    }
}
