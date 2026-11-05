package com.selfforge.discipline.auth;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.selfforge.discipline.auth.AuthRequests.LoginRequest;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class AuthServiceLoginTests {
    @Test
    void unknownEmailConsumesPasswordVerificationWorkBeforeReturningGenericError() {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordHasher passwords = mock(PasswordHasher.class);
        when(users.findByEmail("absent@example.com")).thenReturn(Optional.empty());
        AuthService service = new AuthService(users, mock(AuthSessionRepository.class), passwords,
                mock(TokenService.class), mock(RegistrationVerification.class), mock(OAuthIdentityRepository.class),
                mock(AccountSecurityEventService.class), mock(BetaInviteService.class), "2026-10-28", "");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.login(new LoginRequest("ABSENT@example.com", "valid-password")));

        verify(passwords).consumeMissingAccountWork(eq("valid-password"));
        verify(users).findByEmail("absent@example.com");
        org.junit.jupiter.api.Assertions.assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
    }
}
