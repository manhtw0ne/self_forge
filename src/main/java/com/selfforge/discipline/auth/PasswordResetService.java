package com.selfforge.discipline.auth;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Locale;

@Service
@Transactional
public class PasswordResetService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PasswordResetService.class);
    private final AppUserRepository users;
    private final PasswordResetCodeRepository codes;
    private final PasswordHasher hasher;
    private final AuthSessionRepository sessions;
    private final PasswordResetMail mail;
    private final Clock clock;
    private final AccountSecurityEventService securityEvents;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(AppUserRepository users, PasswordResetCodeRepository codes,
            PasswordHasher hasher, AuthSessionRepository sessions, PasswordResetMail mail, Clock clock,
            AccountSecurityEventService securityEvents) {
        this.users = users; this.codes = codes; this.hasher = hasher;
        this.sessions = sessions; this.mail = mail; this.clock = clock;
        this.securityEvents = securityEvents;
    }
    public boolean available() { return mail.available(); }
    private void requireAvailable() {
        if (!available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chức năng email chưa sẵn sàng.");
    }
    public void request(String email) {
        requireAvailable();
        var found = users.findByEmail(email.trim().toLowerCase(Locale.ROOT));
        if (found.isEmpty()) return;
        var user = users.lockById(found.get().getId()).orElseThrow();
        var code = codes.findById(user.getId()).orElseGet(() -> new PasswordResetCode(user.getId()));
        var now = clock.instant();
        if (!code.canSend(now)) return;
        String otp = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        code.issue(hasher.hash(otp), now);
        code = codes.save(code);
        try {
            mail.send(user.getEmail(), otp);
        } catch (MailException exception) {
            // Keep throttling, invalidate an undelivered code, and do not reveal account existence.
            code.consume();
            log.warn("Password reset email delivery failed; code invalidated.");
        }
    }
    @Transactional(noRollbackFor = InvalidCode.class)
    public void reset(String email, String otp, String password) {
        requireAvailable();
        PasswordPolicy.validate(email, password);
        var found = users.findByEmail(email.trim().toLowerCase(Locale.ROOT));
        if (found.isEmpty()) {
            // Keep an unknown address on the same expensive verification path
            // as a wrong or expired OTP before returning the generic error.
            hasher.consumeMissingAccountWork(otp);
            throw new InvalidCode();
        }
        var user = users.lockById(found.get().getId()).orElseThrow();
        var code = codes.findById(user.getId()).orElse(null);
        if (code == null) {
            hasher.consumeMissingAccountWork(otp);
            throw new InvalidCode();
        }
        if (code.getCodeHash() == null) {
            // A delivery failure consumes the code and clears its hash. Do the
            // same bounded dummy work instead of dereferencing the cleared value.
            hasher.consumeMissingAccountWork(otp);
            throw new InvalidCode();
        }
        boolean matchingCode = hasher.matches(otp, code.getCodeHash());
        if (!code.usable(clock.instant())) throw new InvalidCode();
        if (!matchingCode) {
            code.failedAttempt();
            throw new InvalidCode();
        }
        user.updatePasswordHash(hasher.hash(password));
        code.consume();
        sessions.deleteByUserId(user.getId());
        securityEvents.record(user.getId(), AccountSecurityEventType.PASSWORD_RESET);
    }
    public static class InvalidCode extends IllegalArgumentException {
        public InvalidCode() { super("Mã không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới."); }
    }
}
