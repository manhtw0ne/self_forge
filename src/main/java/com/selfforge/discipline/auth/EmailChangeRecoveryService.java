package com.selfforge.discipline.auth;

import java.net.URI;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Restores the old sign-in email only when its holder uses a short-lived one-time proof. */
@Service
public class EmailChangeRecoveryService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(EmailChangeRecoveryService.class);
    private static final Pattern TOKEN = Pattern.compile("[A-Za-z0-9_-]{43}");
    private final EmailChangeRecoveryRepository recoveries;
    private final AppUserRepository users;
    private final EmailChangeCodeRepository emailChangeCodes;
    private final AuthSessionRepository sessions;
    private final AccountSecurityEventService securityEvents;
    private final PasswordResetMail mail;
    private final Clock clock;
    private final String publicUrl;
    private final SecureRandom random = new SecureRandom();

    public EmailChangeRecoveryService(EmailChangeRecoveryRepository recoveries, AppUserRepository users,
            EmailChangeCodeRepository emailChangeCodes, AuthSessionRepository sessions,
            AccountSecurityEventService securityEvents, PasswordResetMail mail, Clock clock,
            @Value("${app.public-url:}") String publicUrl) {
        this.recoveries = recoveries;
        this.users = users;
        this.emailChangeCodes = emailChangeCodes;
        this.sessions = sessions;
        this.securityEvents = securityEvents;
        this.mail = mail;
        this.clock = clock;
        this.publicUrl = normalisePublicUrl(publicUrl);
    }

    /** Returns null unless a safe, explicit public web URL has been configured. */
    public String issueLink(Long userId, String previousEmail, String changedEmail) {
        if (publicUrl == null) return null;
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String tokenHash = hash(token);
        var now = clock.instant();
        EmailChangeRecovery recovery = recoveries.findById(userId)
                .orElseGet(() -> new EmailChangeRecovery(userId, previousEmail, changedEmail, tokenHash, now));
        if (recovery.getPreviousEmail() != null) recovery.replace(previousEmail, changedEmail, tokenHash, now);
        recoveries.save(recovery);
        // The fragment prevents ordinary page loads, CDN logs, and Referer headers from receiving the token.
        return publicUrl + "/email-change-recovery#token=" + token;
    }

    @Transactional(readOnly = true)
    public boolean usable(String token) {
        String tokenHash = validHash(token);
        return tokenHash != null && recoveries.findByTokenHash(tokenHash).map(row -> row.usable(clock.instant())).orElse(false);
    }

    @Transactional(noRollbackFor = InvalidRecovery.class)
    public void recover(String token) {
        String tokenHash = validHash(token);
        if (tokenHash == null) throw new InvalidRecovery();
        EmailChangeRecovery recovery = recoveries.lockByTokenHash(tokenHash).orElseThrow(InvalidRecovery::new);
        if (!recovery.usable(clock.instant())) throw new InvalidRecovery();
        AppUser user = users.lockById(recovery.getUserId()).orElseThrow(InvalidRecovery::new);
        if (!user.getEmail().equals(recovery.getChangedEmail()) || users.existsByEmail(recovery.getPreviousEmail())) {
            recovery.consume();
            throw new InvalidRecovery();
        }
        String changedEmail = recovery.getChangedEmail();
        user.updateEmail(recovery.getPreviousEmail());
        user.markEmailVerified(clock.instant());
        recovery.consume();
        emailChangeCodes.deleteById(user.getId());
        sessions.deleteByUserId(user.getId());
        securityEvents.record(user.getId(), AccountSecurityEventType.EMAIL_CHANGE_RECOVERED);
        notifyChangedAddressAfterCommit(changedEmail);
    }

    private void notifyChangedAddressAfterCommit(String changedEmail) {
        if (!org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            sendRestoredNotice(changedEmail);
            return;
        }
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override public void afterCommit() {
                        sendRestoredNotice(changedEmail);
                    }
                });
    }

    private void sendRestoredNotice(String changedEmail) {
        try { mail.sendEmailRestoredNotice(changedEmail); }
        catch (org.springframework.mail.MailException deliveryFailure) {
            log.warn("Email-change recovery notice could not be delivered.");
        }
    }

    private String validHash(String token) { return token != null && TOKEN.matcher(token).matches() ? hash(token) : null; }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }

    private static String normalisePublicUrl(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            URI uri = URI.create(value.trim());
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null || uri.getRawQuery() != null || uri.getRawFragment() != null || uri.getUserInfo() != null) return null;
            String normalized = uri.toString();
            return normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
        } catch (IllegalArgumentException invalid) { return null; }
    }

    public static class InvalidRecovery extends IllegalArgumentException {
        public InvalidRecovery() { super("Liên kết khôi phục không hợp lệ hoặc đã hết hạn."); }
    }
}
