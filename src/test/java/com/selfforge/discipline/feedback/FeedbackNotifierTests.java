package com.selfforge.discipline.feedback;

import com.selfforge.discipline.auth.PasswordResetMail;
import java.time.Instant;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class FeedbackNotifierTests {
    private static final FeedbackSubmitted REPORT = new FeedbackSubmitted(7L, FeedbackType.BUG,
            "Save did not work", "Open Help then submit", "A clear confirmation", "en", Instant.parse("2026-11-02T01:00:00Z"));

    @Test void optionalNoticeUsesOnlySubmittedReportFields() {
        var mail = mock(PasswordResetMail.class);
        when(mail.operationalAvailable()).thenReturn(true);
        new FeedbackNotifier(mail, "operator@example.com").notifyAfterCommit(REPORT);
        verify(mail).sendOperational(eq("operator@example.com"), contains("#7 — BUG"), contains("Save did not work"));
    }

    @Test void unavailableOrFailingMailNeverRejectsACommittedReport() {
        var unavailable = mock(PasswordResetMail.class);
        when(unavailable.operationalAvailable()).thenReturn(false);
        assertDoesNotThrow(() -> new FeedbackNotifier(unavailable, "operator@example.com").notifyAfterCommit(REPORT));
        verify(unavailable).operationalAvailable();
        verifyNoMoreInteractions(unavailable);

        var failing = mock(PasswordResetMail.class);
        when(failing.operationalAvailable()).thenReturn(true);
        doThrow(new org.springframework.mail.MailSendException("private provider detail"))
                .when(failing).sendOperational(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        assertDoesNotThrow(() -> new FeedbackNotifier(failing, "operator@example.com").notifyAfterCommit(REPORT));
    }

    @Test void invalidRecipientFailsAtConfigurationTime() {
        assertThrows(IllegalArgumentException.class, () -> new FeedbackNotifier(mock(PasswordResetMail.class), "not-an-email"));
    }
}
