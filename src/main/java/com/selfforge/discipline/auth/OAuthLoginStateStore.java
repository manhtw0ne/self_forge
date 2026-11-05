package com.selfforge.discipline.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
class OAuthLoginStateStore {
    record ConsumedState(boolean valid, String verifier, String returnPath, String nativeHandoffHash, boolean termsAccepted) {}
    private final OAuthLoginStateRepository states;
    private final TokenService tokens;
    private final Clock clock;

    OAuthLoginStateStore(OAuthLoginStateRepository states, TokenService tokens, Clock clock) {
        this.states = states;
        this.tokens = tokens;
        this.clock = clock;
    }

    @Transactional
    String create(OAuthProvider provider, String verifier, String returnPath) {
        return create(provider, verifier, returnPath, null, false);
    }

    @Transactional
    String create(OAuthProvider provider, String verifier, String returnPath, String nativeHandoffHash) {
        return create(provider, verifier, returnPath, nativeHandoffHash, false);
    }

    @Transactional
    String create(OAuthProvider provider, String verifier, String returnPath, String nativeHandoffHash, boolean termsAccepted) {
        Instant now = clock.instant();
        states.deleteByExpiresAtBefore(now.minus(Duration.ofDays(1)));
        String raw = tokens.newToken();
        states.save(new OAuthLoginState(tokens.hash(raw), provider, verifier, returnPath, nativeHandoffHash, termsAccepted,
                now.plus(Duration.ofMinutes(10)), now));
        return raw;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    ConsumedState consume(OAuthProvider provider, String rawState) {
        if (rawState == null || rawState.isBlank() || rawState.length() > 256) return invalid();
        Instant now = clock.instant();
        OAuthLoginState state = states.lockByStateHash(tokens.hash(rawState)).orElse(null);
        if (state == null) return invalid();
        states.delete(state);
        if (!provider.name().equals(state.provider) || !state.expiresAt.isAfter(now)) return invalid();
        return new ConsumedState(true, state.codeVerifier, state.returnPath, state.nativeHandoffHash, state.termsAccepted);
    }

    private static ConsumedState invalid() {
        return new ConsumedState(false, null, "/", null, false);
    }
}
