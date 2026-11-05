package com.selfforge.discipline.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class OAuthConfigurationTests {
    @Test
    void enabledProviderRequiresCompleteCredentialsAndSafeRedirectUri() {
        assertThrows(IllegalArgumentException.class, () -> service(true, "id", "", "https://self.example/api/auth/oauth/google/callback",
                false, "", "", ""));
        assertThrows(IllegalArgumentException.class, () -> service(false, "", "", "", true, "id", "secret", "http://example.com/callback"));
        assertThrows(IllegalArgumentException.class, () -> service(true, "id", "secret", "https:/missing-host/callback",
                false, "", "", ""));
        assertThrows(IllegalArgumentException.class, () -> service(true, "id", "secret", "https://user@self.example/callback#fragment",
                false, "", "", ""));
    }

    @Test
    void configuredProviderIsAdvertisedWhileDisabledProviderStaysHidden() {
        OAuthLoginService service = service(true, "google-id", "google-secret", "https://self.example/api/auth/oauth/google/callback",
                false, "", "", "");
        assertTrue(service.availability().google());
        assertFalse(service.availability().facebook());
    }

    private static OAuthLoginService service(boolean googleEnabled, String googleId, String googleSecret, String googleRedirect,
            boolean facebookEnabled, String facebookId, String facebookSecret, String facebookRedirect) {
        AuthService auth = mock(AuthService.class);
        return new OAuthLoginService(mock(OAuthLoginStateStore.class), mock(OAuthLoginTicketStore.class),
                mock(OAuthNativeHandoffStore.class), auth, mock(TokenService.class), RestClient.builder(),
                googleEnabled, googleId, googleSecret, googleRedirect,
                facebookEnabled, facebookId, facebookSecret, facebookRedirect);
    }
}
