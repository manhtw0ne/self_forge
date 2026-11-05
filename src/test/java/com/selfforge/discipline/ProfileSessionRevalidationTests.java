package com.selfforge.discipline;
import com.selfforge.discipline.auth.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfileSessionRevalidationTests {
    @Test void revocationWhileWaitingForUserLockPreventsProfileAndPasswordWrites() {
        for (boolean password : new boolean[]{false, true}) {
            var current = mock(CurrentUserService.class); var hasher = mock(PasswordHasher.class);
            var sessions = mock(AuthSessionRepository.class); var codes = mock(PasswordResetCodeRepository.class);
            var users = mock(AppUserRepository.class); var user = mock(AppUser.class);
            when(user.getId()).thenReturn(1L); when(users.lockById(1L)).thenReturn(Optional.of(user));
            var request = new MockHttpServletRequest();
            when(current.requireUser(request)).thenReturn(user).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));
            var controller = new ProfileController(current, hasher, sessions, codes, users, mock(AccountSecurityEventService.class));
            ReflectionTestUtils.setField(controller, "entityManager", mock(EntityManager.class));
            var failure = assertThrows(ResponseStatusException.class, () -> {
                if (password) controller.changePassword(new ProfileController.ChangePasswordRequest("old-password", "new-password", "new-password"), request);
                else controller.updateProfile(new ProfileController.UpdateProfileRequest("Changed", null, null, null, null, null), request);
            });
            assertEquals(401, failure.getStatusCode().value());
            verify(user, never()).updateProfile(any(), any(), any(), any());
            verify(user, never()).updateLanguage(any());
            verify(user, never()).updatePasswordHash(any());
            verifyNoInteractions(hasher, sessions, codes);
        }
    }
}
