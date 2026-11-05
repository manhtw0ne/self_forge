package com.selfforge.discipline.auth;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class EmailChangeService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(EmailChangeService.class);
    private final AppUserRepository users;
    private final EmailChangeCodeRepository codes;
    private final RegistrationCodeRepository registrationCodes;
    private final PasswordHasher passwords;
    private final AuthSessionRepository sessions;
    private final PasswordResetMail mail;
    private final Clock clock;
    private final AccountSecurityEventService securityEvents;
    private final EmailChangeRecoveryService recoveries;
    private final SecureRandom random = new SecureRandom();

    public EmailChangeService(AppUserRepository users, EmailChangeCodeRepository codes,
            RegistrationCodeRepository registrationCodes, PasswordHasher passwords, AuthSessionRepository sessions,
            PasswordResetMail mail, Clock clock, AccountSecurityEventService securityEvents,
            EmailChangeRecoveryService recoveries) {
        this.users = users; this.codes = codes; this.registrationCodes = registrationCodes; this.passwords = passwords;
        this.sessions = sessions; this.mail = mail; this.clock = clock; this.securityEvents = securityEvents; this.recoveries = recoveries;
    }

    public boolean available() { return mail.available(); }

    public void request(Long userId, String inputEmail, String currentPassword) {
        requireAvailable();
        AppUser user = users.lockById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!passwords.matches(currentPassword, user.getPasswordHash())) throw new IllegalArgumentException("Mật khẩu hiện tại không đúng.");
        String email = normalize(inputEmail);
        if (user.getEmail().equals(email)) throw new IllegalArgumentException("Email mới trùng với email hiện tại.");
        if (users.existsByEmail(email)) throw new IllegalStateException("Email này đã được dùng cho một tài khoản khác.");
        EmailChangeCode code = codes.lockByUserId(userId).orElseGet(() -> new EmailChangeCode(userId, email));
        if (!code.getPendingEmail().equals(email)) {
            // Do not preserve a proof for a different target address.
            codes.delete(code);
            codes.flush();
            code = new EmailChangeCode(userId, email);
        }
        var now = clock.instant();
        if (!code.canSend(now)) return;
        String otp = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        code.issue(passwords.hash(otp), now);
        codes.saveAndFlush(code);
        try { mail.sendEmailChange(email, otp); }
        catch (MailException deliveryFailure) {
            code.consume();
            log.warn("Email-change delivery failed; code invalidated.");
        }
    }

    @Transactional(noRollbackFor = InvalidCode.class)
    public void confirm(Long userId, String otp) {
        requireAvailable();
        AppUser user = users.lockById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        EmailChangeCode code = codes.lockByUserId(userId).orElseThrow(InvalidCode::new);
        if (!code.usable(clock.instant())) throw new InvalidCode();
        if (!passwords.matches(otp, code.getCodeHash())) {
            code.failedAttempt();
            throw new InvalidCode();
        }
        String previousEmail = user.getEmail();
        if (users.existsByEmail(code.getPendingEmail())) throw new IllegalStateException("Email này đã được dùng cho một tài khoản khác.");
        String changedEmail = code.getPendingEmail();
        user.updateEmail(changedEmail);
        user.markEmailVerified(clock.instant());
        code.consume();
        registrationCodes.deleteById(previousEmail);
        sessions.deleteByUserId(userId);
        securityEvents.record(userId, AccountSecurityEventType.EMAIL_CHANGED);
        notifyPreviousEmailAfterCommit(previousEmail, recoveries.issueLink(userId, previousEmail, changedEmail));
    }

    private void requireAvailable() {
        if (!available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chức năng email chưa sẵn sàng.");
    }

    private void notifyPreviousEmailAfterCommit(String previousEmail, String recoveryUrl) {
        // Never send a "change completed" alert if this database transaction
        // later rolls back. A delivery failure must not undo the security change.
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            sendSecurityNotice(previousEmail, recoveryUrl);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                sendSecurityNotice(previousEmail, recoveryUrl);
            }
        });
    }

    private void sendSecurityNotice(String previousEmail, String recoveryUrl) {
        try { mail.sendEmailChangedNotice(previousEmail, recoveryUrl); }
        catch (MailException deliveryFailure) {
            log.warn("Email-change security notice could not be delivered.");
        }
    }
    private static String normalize(String value) { return value.trim().toLowerCase(Locale.ROOT); }

    public static class InvalidCode extends IllegalArgumentException {
        public InvalidCode() { super("Mã không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới."); }
    }
}
