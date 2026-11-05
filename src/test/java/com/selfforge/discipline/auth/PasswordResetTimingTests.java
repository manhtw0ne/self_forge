package com.selfforge.discipline.auth;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PasswordResetTimingTests {
    @Test
    void unknownAccountConsumesOtpVerificationWorkBeforeGenericFailure() {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordHasher passwords = mock(PasswordHasher.class);
        PasswordResetMail mail = mock(PasswordResetMail.class);
        when(mail.available()).thenReturn(true);
        when(users.findByEmail("missing@example.com")).thenReturn(Optional.empty());
        PasswordResetService service = new PasswordResetService(users, mock(PasswordResetCodeRepository.class), passwords,
                mock(AuthSessionRepository.class), mail, Clock.systemUTC(), mock(AccountSecurityEventService.class));

        assertThrows(PasswordResetService.InvalidCode.class,
                () -> service.reset("MISSING@example.com", "123456", "valid-password"));

        verify(passwords).consumeMissingAccountWork(eq("123456"));
    }
}
