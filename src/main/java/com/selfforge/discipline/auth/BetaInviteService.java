package com.selfforge.discipline.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Issues individually revocable, bounded beta invitations. Generated secrets
 * are returned once to the operator and stored only as a SHA-256 digest.
 */
@Service
public class BetaInviteService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int CODE_BYTES = 20;

    private final BetaInviteRepository invites;
    private final Clock clock;
    private final boolean enabled;

    public BetaInviteService(BetaInviteRepository invites, Clock clock,
            @Value("${app.registration.managed-invites-enabled:false}") boolean enabled) {
        this.invites = invites;
        this.clock = clock;
        this.enabled = enabled;
    }

    /** Whether managed invitations close registration, regardless of current invite count. */
    public boolean enabled() { return enabled; }

    /**
     * Locks and validates a usable invitation without spending it. The lock is
     * held by the surrounding registration transaction until OTP validation
     * has succeeded, so a bad OTP never burns an invitation use.
     */
    @Transactional
    public boolean reserve(String suppliedCode) {
        if (!enabled) return false;
        String normalized = normalizeCode(suppliedCode);
        if (normalized == null) return false;
        var invite = invites.lockByCodeHash(hash(normalized)).orElse(null);
        return invite != null && invite.canConsume(clock.instant());
    }

    /** Atomically spends the previously validated invitation use. */
    @Transactional
    public boolean consume(String suppliedCode) {
        if (!enabled) return false;
        String normalized = normalizeCode(suppliedCode);
        if (normalized == null) return false;
        var invite = invites.lockByCodeHash(hash(normalized)).orElse(null);
        if (invite == null || !invite.canConsume(clock.instant())) return false;
        invite.consume();
        return true;
    }

    @Transactional
    public IssuedInvite create(String label, int maxUses, Instant expiresAt) {
        if (maxUses < 1 || maxUses > 1000) throw new IllegalArgumentException("Invalid invite use limit");
        Instant now = clock.instant();
        if (expiresAt != null && !expiresAt.isAfter(now)) {
            throw new IllegalArgumentException("Invite expiry must be in the future");
        }
        String cleanLabel = label == null ? "" : label.trim();
        if (cleanLabel.length() > 100) throw new IllegalArgumentException("Invalid invite label");
        String code = newCode();
        BetaInvite saved = invites.saveAndFlush(new BetaInvite(hash(code), cleanLabel, maxUses, expiresAt, now));
        return IssuedInvite.from(saved, code);
    }

    @Transactional(readOnly = true)
    public List<InviteSummary> list() {
        return invites.findTop200ByOrderByIdDesc().stream().map(InviteSummary::from).toList();
    }

    @Transactional
    public void revoke(long id) {
        if (id < 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        BetaInvite invite = invites.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        invite.revoke(clock.instant());
    }

    private static String newCode() {
        byte[] bytes = new byte[CODE_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String normalizeCode(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.length() >= 16 && normalized.length() <= 256 ? normalized : null;
    }

    private static String hash(String value) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException unavailable) {
            throw new IllegalStateException("SHA-256 is unavailable", unavailable);
        }
    }

    public record IssuedInvite(long id, String code, String label, int maxUses, int useCount,
                               boolean active, Instant expiresAt, Instant createdAt) {
        static IssuedInvite from(BetaInvite invite, String code) {
            return new IssuedInvite(invite.getId(), code, invite.getLabel(), invite.getMaxUses(),
                    invite.getUseCount(), invite.isActive(), invite.getExpiresAt(), invite.getCreatedAt());
        }
    }

    /** Deliberately excludes the invitation code and its hash. */
    public record InviteSummary(long id, String label, int maxUses, int useCount, boolean active,
                                Instant expiresAt, Instant createdAt, Instant revokedAt) {
        static InviteSummary from(BetaInvite invite) {
            return new InviteSummary(invite.getId(), invite.getLabel(), invite.getMaxUses(), invite.getUseCount(),
                    invite.isActive(), invite.getExpiresAt(), invite.getCreatedAt(), invite.getRevokedAt());
        }
    }
}
