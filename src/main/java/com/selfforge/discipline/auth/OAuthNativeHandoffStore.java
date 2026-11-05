package com.selfforge.discipline.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
class OAuthNativeHandoffStore {
    record CreatedHandoff(String raw, String hash) {}
    enum Status { PENDING, COMPLETED, INVALID }
    record ConsumedHandoff(Status status, Long userId) {}

    private final OAuthNativeHandoffRepository handoffs;
    private final AppUserRepository users;
    private final TokenService tokens;
    private final Clock clock;

    OAuthNativeHandoffStore(OAuthNativeHandoffRepository handoffs, AppUserRepository users, TokenService tokens, Clock clock) {
        this.handoffs = handoffs;
        this.users = users;
        this.tokens = tokens;
        this.clock = clock;
    }

    @Transactional
    CreatedHandoff create() {
        Instant now = clock.instant();
        handoffs.deleteByExpiresAtBefore(now.minus(Duration.ofDays(1)));
        String raw = tokens.newToken();
        String hash = tokens.hash(raw);
        handoffs.save(new OAuthNativeHandoff(hash, now.plus(Duration.ofMinutes(10)), now));
        return new CreatedHandoff(raw, hash);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void complete(String handoffHash, Long userId) {
        OAuthNativeHandoff handoff = handoffs.lockByHandoffHash(handoffHash).orElse(null);
        if (handoff == null || !handoff.expiresAt.isAfter(clock.instant())) {
            if (handoff != null) handoffs.delete(handoff);
            throw new IllegalStateException("Phiên đăng nhập trên ứng dụng đã hết hạn.");
        }
        handoff.complete(users.getReferenceById(userId));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    ConsumedHandoff consume(String rawHandoff) {
        if (rawHandoff == null || !rawHandoff.matches("[A-Za-z0-9_-]{43}")) return invalid();
        OAuthNativeHandoff handoff = handoffs.lockByHandoffHash(tokens.hash(rawHandoff)).orElse(null);
        if (handoff == null) return invalid();
        if (!handoff.expiresAt.isAfter(clock.instant())) {
            handoffs.delete(handoff);
            return invalid();
        }
        if (handoff.user == null) return new ConsumedHandoff(Status.PENDING, null);
        Long userId = handoff.user.getId();
        handoffs.delete(handoff);
        return new ConsumedHandoff(Status.COMPLETED, userId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void discard(String handoffHash) {
        OAuthNativeHandoff handoff = handoffs.lockByHandoffHash(handoffHash).orElse(null);
        if (handoff != null) handoffs.delete(handoff);
    }

    private static ConsumedHandoff invalid() {
        return new ConsumedHandoff(Status.INVALID, null);
    }
}
