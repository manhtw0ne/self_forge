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
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(AppUserRepository users, PasswordResetCodeRepository codes,
            PasswordHasher hasher, AuthSessionRepository sessions, PasswordResetMail mail, Clock clock) {
        this.users = users; this.codes = codes; this.hasher = hasher;
        this.sessions = sessions; this.mail = mail; this.clock = clock;
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
        var found = users.findByEmail(email.trim().toLowerCase(Locale.ROOT));
        if (found.isEmpty()) throw new InvalidCode();
        var user = users.lockById(found.get().getId()).orElseThrow();
        var code = codes.findById(user.getId()).orElseThrow(InvalidCode::new);
        if (!code.usable(clock.instant())) throw new InvalidCode();
        if (!hasher.matches(otp, code.getCodeHash())) {
            code.failedAttempt();
            throw new InvalidCode();
        }
        user.updatePasswordHash(hasher.hash(password));
        code.consume();
        sessions.deleteByUserId(user.getId());
    }
    public static class InvalidCode extends IllegalArgumentException {
        public InvalidCode() { super("Mã không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới."); }
    }
}