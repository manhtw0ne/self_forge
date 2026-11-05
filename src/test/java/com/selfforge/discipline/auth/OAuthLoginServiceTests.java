package com.selfforge.discipline.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class OAuthLoginServiceTests {
    @Test
    void onlyAcceptsInternalSafeReturnPaths() {
        assertEquals("/weekly", OAuthLoginService.safeReturnPath("/weekly"));
        assertEquals("/goals?tab=active", OAuthLoginService.safeReturnPath("/goals?tab=active"));
        assertEquals("/", OAuthLoginService.safeReturnPath(null));
        assertEquals("/", OAuthLoginService.safeReturnPath("https://attacker.example"));
        assertEquals("/", OAuthLoginService.safeReturnPath("//attacker.example"));
        assertEquals("/", OAuthLoginService.safeReturnPath("/api/auth/me"));
        assertEquals("/", OAuthLoginService.safeReturnPath("/login?next=/weekly"));
        assertEquals("/", OAuthLoginService.safeReturnPath("/\\attacker.example"));
    }
}
