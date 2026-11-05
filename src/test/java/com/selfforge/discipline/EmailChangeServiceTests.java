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

class EmailChangeServiceTests {
    @Test void confirmationUsesOnlyAValidShortLivedProofAndRevokesEverySession() {
        var users = mock(AppUserRepository.class); var codes = mock(EmailChangeCodeRepository.class);
        var registration = mock(RegistrationCodeRepository.class); var sessions = mock(AuthSessionRepository.class);
        var mail = mock(PasswordResetMail.class); var events = mock(AccountSecurityEventService.class); var recoveries = mock(EmailChangeRecoveryService.class); var hasher = new PasswordHasher();
        var user = mock(AppUser.class); when(user.getEmail()).thenReturn("old@example.com");
        var code = new EmailChangeCode(7L, "new@example.com"); code.issue(hasher.hash("123456"), Instant.EPOCH);
        when(mail.available()).thenReturn(true); when(users.lockById(7L)).thenReturn(Optional.of(user));
        when(codes.lockByUserId(7L)).thenReturn(Optional.of(code)); when(users.existsByEmail("new@example.com")).thenReturn(false);
        var service = new EmailChangeService(users, codes, registration, hasher, sessions, mail,
                Clock.fixed(Instant.EPOCH.plusSeconds(30), ZoneOffset.UTC), events, recoveries);

        service.confirm(7L, "123456");

        verify(user).updateEmail("new@example.com"); verify(user).markEmailVerified(Instant.EPOCH.plusSeconds(30));
        verify(registration).deleteById("old@example.com"); verify(sessions).deleteByUserId(7L);
        verify(events).record(7L, AccountSecurityEventType.EMAIL_CHANGED);
        assertFalse(code.usable(Instant.EPOCH.plusSeconds(30)));

        verify(recoveries).issueLink(7L, "old@example.com", "new@example.com");
        verify(mail).sendEmailChangedNotice("old@example.com", null);
    }

    @Test void invalidCodeDoesNotChangeEmailOrRevokeSessions() {
        var users = mock(AppUserRepository.class); var codes = mock(EmailChangeCodeRepository.class);
        var sessions = mock(AuthSessionRepository.class); var mail = mock(PasswordResetMail.class); var hasher = new PasswordHasher();
        var code = new EmailChangeCode(7L, "new@example.com"); code.issue(hasher.hash("123456"), Instant.EPOCH);
        when(mail.available()).thenReturn(true); when(users.lockById(7L)).thenReturn(Optional.of(mock(AppUser.class)));
        when(codes.lockByUserId(7L)).thenReturn(Optional.of(code));
        var service = new EmailChangeService(users, codes, mock(RegistrationCodeRepository.class), hasher, sessions, mail,
                Clock.fixed(Instant.EPOCH.plusSeconds(30), ZoneOffset.UTC), mock(AccountSecurityEventService.class), mock(EmailChangeRecoveryService.class));

        assertThrows(EmailChangeService.InvalidCode.class, () -> service.confirm(7L, "000000"));
        verifyNoInteractions(sessions);
    }

    @Test void requestNormalizesTheTargetAndNeverSendsWithoutCurrentPasswordProof() {
        var users = mock(AppUserRepository.class); var codes = mock(EmailChangeCodeRepository.class);
        var mail = mock(PasswordResetMail.class); var hasher = new PasswordHasher();
        var user = new AppUser("old@example.com", "Owner", hasher.hash("current-password"));
        ReflectionTestUtils.setField(user, "id", 7L);
        when(mail.available()).thenReturn(true); when(users.lockById(7L)).thenReturn(Optional.of(user));
        when(users.existsByEmail("new@example.com")).thenReturn(false); when(codes.lockByUserId(7L)).thenReturn(Optional.empty());
        when(codes.saveAndFlush(any(EmailChangeCode.class))).thenAnswer(answer -> answer.getArgument(0));
        var service = new EmailChangeService(users, codes, mock(RegistrationCodeRepository.class), hasher,
                mock(AuthSessionRepository.class), mail, Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), mock(AccountSecurityEventService.class), mock(EmailChangeRecoveryService.class));

        service.request(7L, " NEW@example.com ", "current-password");
        verify(mail).sendEmailChange(eq("new@example.com"), matches("[0-9]{6}"));
        assertThrows(IllegalArgumentException.class, () -> service.request(7L, "again@example.com", "wrong-password"));
        verify(mail, times(2)).available();
        verifyNoMoreInteractions(mail);
    }
}
