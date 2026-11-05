package com.selfforge.discipline.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:oauth-store;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.flyway.clean-disabled=true",
        "spring.flyway.baseline-on-migrate=false",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@ActiveProfiles("test")
class OAuthLoginStoreTests {
    @Autowired OAuthLoginStateStore states;
    @Autowired OAuthLoginTicketStore tickets;
    @Autowired OAuthNativeHandoffStore handoffs;
    @Autowired AppUserRepository users;
    @Autowired AuthService auth;

    @Test
    void stateIsSingleUseAndRejectsProviderChanges() {
        String raw = states.create(OAuthProvider.GOOGLE, "verifier", "/goals?tab=active");
        var accepted = states.consume(OAuthProvider.GOOGLE, raw);
        assertTrue(accepted.valid());
        assertEquals("verifier", accepted.verifier());
        assertEquals("/goals?tab=active", accepted.returnPath());
        assertFalse(states.consume(OAuthProvider.GOOGLE, raw).valid());

        String mismatched = states.create(OAuthProvider.FACEBOOK, null, "/weekly");
        assertFalse(states.consume(OAuthProvider.GOOGLE, mismatched).valid());
        assertFalse(states.consume(OAuthProvider.FACEBOOK, mismatched).valid());

        String nativeState = states.create(OAuthProvider.GOOGLE, "verifier", "/goals", "native-handoff-hash");
        var nativeAccepted = states.consume(OAuthProvider.GOOGLE, nativeState);
        assertTrue(nativeAccepted.valid());
        assertEquals("native-handoff-hash", nativeAccepted.nativeHandoffHash());

        String consenting = states.create(OAuthProvider.GOOGLE, "verifier", "/goals", null, true);
        assertTrue(states.consume(OAuthProvider.GOOGLE, consenting).termsAccepted());
    }

    @Test
    void ticketIsSingleUseAndKeepsOnlyItsUserReference() {
        AppUser user = users.save(new AppUser(UUID.randomUUID() + "@example.com", "OAuth", "hash"));
        String raw = tickets.issue(user.getId());
        var accepted = tickets.consume(raw);
        assertTrue(accepted.valid());
        assertEquals(user.getId(), accepted.userId());
        assertFalse(tickets.consume(raw).valid());
    }

    @Test
    void nativeHandoffStaysPendingUntilTheProviderCallbackAndIsSingleUse() {
        var created = handoffs.create();
        assertEquals(OAuthNativeHandoffStore.Status.PENDING, handoffs.consume(created.raw()).status());

        AppUser user = users.save(new AppUser(UUID.randomUUID() + "@example.com", "Native OAuth", "hash"));
        handoffs.complete(created.hash(), user.getId());
        var completed = handoffs.consume(created.raw());
        assertEquals(OAuthNativeHandoffStore.Status.COMPLETED, completed.status());
        assertEquals(user.getId(), completed.userId());
        assertEquals(OAuthNativeHandoffStore.Status.INVALID, handoffs.consume(created.raw()).status());
    }

    @Test
    void providerSubjectRemainsBoundToTheFirstVerifiedAccount() {
        org.junit.jupiter.api.Assertions.assertThrows(AuthService.TermsRequired.class,
                () -> auth.authenticateWithOAuth(OAuthProvider.GOOGLE, "new-subject", UUID.randomUUID() + "@example.com", "New", false));
        AppUser first = auth.authenticateWithOAuth(OAuthProvider.GOOGLE, "google-subject", UUID.randomUUID() + "@example.com", "First", true);
        AppUser later = auth.authenticateWithOAuth(OAuthProvider.GOOGLE, "google-subject", UUID.randomUUID() + "@example.com", "Changed email", false);
        assertEquals(first.getId(), later.getId());
        assertTrue(later.getEmailVerifiedAt() != null);
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> auth.authenticateWithOAuth(OAuthProvider.GOOGLE, "another-subject", first.getEmail(), "Unexpected", false));
    }
}
