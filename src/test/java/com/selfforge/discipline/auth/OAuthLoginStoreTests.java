package com.selfforge.discipline.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    @Autowired TokenService tokens;

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

        AppUser linkOwner = users.saveAndFlush(new AppUser(UUID.randomUUID() + "@example.com", "Link owner", "password-hash"));
        String linking = states.createLink(OAuthProvider.GOOGLE, "verifier", "/profile", null, linkOwner.getId(),
                tokens.hash("password-hash"));
        var linked = states.consume(OAuthProvider.GOOGLE, linking);
        assertTrue(linked.valid());
        assertEquals(linkOwner.getId(), linked.linkUserId());
        assertEquals(tokens.hash("password-hash"), linked.linkCredentialHash());
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
    void nativeLinkHandoffCannotMintALoginAndOnlyTheReauthenticatedOwnerCanConsumeIt() {
        AppUser owner = users.saveAndFlush(new AppUser(UUID.randomUUID() + "@example.com", "Link owner", "hash"));
        AppUser other = users.saveAndFlush(new AppUser(UUID.randomUUID() + "@example.com", "Other", "hash"));
        var created = handoffs.create(OAuthNativeHandoffPurpose.LINK);

        assertEquals(OAuthNativeHandoffStore.Status.INVALID, handoffs.consume(created.raw()).status());
        assertEquals(OAuthNativeHandoffStore.Status.PENDING, handoffs.consumeLink(created.raw(), owner.getId()).status());
        assertThrows(IllegalStateException.class,
                () -> handoffs.complete(created.hash(), owner.getId(), OAuthNativeHandoffPurpose.LOGIN));
        assertEquals(OAuthNativeHandoffStore.Status.PENDING, handoffs.consumeLink(created.raw(), owner.getId()).status());
        handoffs.complete(created.hash(), owner.getId(), OAuthNativeHandoffPurpose.LINK);
        assertEquals(OAuthNativeHandoffStore.Status.INVALID, handoffs.consumeLink(created.raw(), other.getId()).status());
        assertEquals(OAuthNativeHandoffStore.Status.COMPLETED, handoffs.consumeLink(created.raw(), owner.getId()).status());
        assertEquals(OAuthNativeHandoffStore.Status.INVALID, handoffs.consumeLink(created.raw(), owner.getId()).status());
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

    @Test
    void unlinkedProviderEmailCannotTakeOverAnExistingPasswordAccount() {
        String email = UUID.randomUUID() + "@example.com";
        AppUser existing = users.save(new AppUser(email, "Password account", "hash"));

        assertThrows(AuthService.OAuthAccountLinkRequired.class,
                () -> auth.authenticateWithOAuth(OAuthProvider.FACEBOOK, "facebook-new-subject", email, "Unexpected", true));
        AppUser unchanged = users.findByEmail(email).orElseThrow();
        assertEquals(existing.getId(), unchanged.getId());
        assertFalse(unchanged.getEmailVerifiedAt() != null);
    }

    @Test
    void explicitLinkBindsOnlyTheReauthenticatedAccountAndExpiresAfterPasswordChange() {
        AppUser owner = users.saveAndFlush(new AppUser(UUID.randomUUID() + "@example.com", "Owner", "owner-password-hash"));
        String proof = tokens.hash(owner.getPasswordHash());

        auth.linkOAuthIdentity(owner.getId(), OAuthProvider.GOOGLE, "google-link-subject", proof);
        AppUser signedIn = auth.authenticateWithOAuth(OAuthProvider.GOOGLE, "google-link-subject",
                UUID.randomUUID() + "@example.com", "Changed provider email", false);
        assertEquals(owner.getId(), signedIn.getId());

        AppUser other = users.saveAndFlush(new AppUser(UUID.randomUUID() + "@example.com", "Other", "other-password-hash"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> auth.linkOAuthIdentity(other.getId(), OAuthProvider.GOOGLE, "google-link-subject",
                        tokens.hash(other.getPasswordHash())));

        owner.updatePasswordHash("new-owner-password-hash");
        users.saveAndFlush(owner);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> auth.linkOAuthIdentity(owner.getId(), OAuthProvider.FACEBOOK, "facebook-link-subject", proof));
    }
}
