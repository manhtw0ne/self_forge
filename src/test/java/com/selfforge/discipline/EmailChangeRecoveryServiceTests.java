package com.selfforge.discipline;

import com.selfforge.discipline.auth.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EmailChangeRecoveryServiceTests {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-28T05:00:00Z"), ZoneOffset.UTC);

    @Test void issuesAFragmentTokenAndOnlyStoresItsFingerprint() {
        var recoveries = mock(EmailChangeRecoveryRepository.class);
        when(recoveries.findById(7L)).thenReturn(Optional.empty());
        when(recoveries.save(any(EmailChangeRecovery.class))).thenAnswer(answer -> answer.getArgument(0));
        var service = service(recoveries, mock(AppUserRepository.class), mock(EmailChangeCodeRepository.class),
                mock(AuthSessionRepository.class), mock(AccountSecurityEventService.class), mock(PasswordResetMail.class));

        String link = service.issueLink(7L, "before@example.com", "after@example.com");

        assertTrue(link.matches("https://app\\.example/email-change-recovery#token=[A-Za-z0-9_-]{43}"));
        var saved = org.mockito.ArgumentCaptor.forClass(EmailChangeRecovery.class);
        verify(recoveries).save(saved.capture());
        assertEquals("before@example.com", saved.getValue().getPreviousEmail());
        assertEquals("after@example.com", saved.getValue().getChangedEmail());
        assertNotEquals(link.substring(link.indexOf("token=") + 6), ReflectionTestUtils.getField(saved.getValue(), "tokenHash"));
    }

    @Test void validOneTimeProofRestoresOldEmailAndEndsAllSessions() {
        var recoveries = mock(EmailChangeRecoveryRepository.class); var users = mock(AppUserRepository.class);
        var codes = mock(EmailChangeCodeRepository.class); var sessions = mock(AuthSessionRepository.class);
        var events = mock(AccountSecurityEventService.class); var mail = mock(PasswordResetMail.class);
        String token = "a".repeat(43);
        var recovery = new EmailChangeRecovery(7L, "before@example.com", "after@example.com", "stored-fingerprint", CLOCK.instant());
        var user = new AppUser("after@example.com", "Owner", "hash");
        ReflectionTestUtils.setField(user, "id", 7L);
        when(recoveries.lockByTokenHash(anyString())).thenReturn(Optional.of(recovery));
        when(users.lockById(7L)).thenReturn(Optional.of(user));
        when(users.existsByEmail("before@example.com")).thenReturn(false);
        var service = service(recoveries, users, codes, sessions, events, mail);

        service.recover(token);

        assertEquals("before@example.com", user.getEmail());
        assertNotNull(user.getEmailVerifiedAt());
        verify(codes).deleteById(7L); verify(sessions).deleteByUserId(7L);
        verify(events).record(7L, AccountSecurityEventType.EMAIL_CHANGE_RECOVERED);
        verify(mail).sendEmailRestoredNotice("after@example.com");
        assertFalse(recovery.usable(CLOCK.instant()));
    }

    @Test void invalidTokenDoesNotQueryOrModifyAnyAccount() {
        var recoveries = mock(EmailChangeRecoveryRepository.class);
        var service = service(recoveries, mock(AppUserRepository.class), mock(EmailChangeCodeRepository.class),
                mock(AuthSessionRepository.class), mock(AccountSecurityEventService.class), mock(PasswordResetMail.class));

        assertThrows(EmailChangeRecoveryService.InvalidRecovery.class, () -> service.recover("not-a-token"));
        verifyNoInteractions(recoveries);
    }

    private static EmailChangeRecoveryService service(EmailChangeRecoveryRepository recoveries, AppUserRepository users,
            EmailChangeCodeRepository codes, AuthSessionRepository sessions, AccountSecurityEventService events,
            PasswordResetMail mail) {
        return new EmailChangeRecoveryService(recoveries, users, codes, sessions, events, mail, CLOCK, "https://app.example/");
    }
}
