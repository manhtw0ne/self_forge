package com.selfforge.discipline.auth;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Locale;

@Service
@Transactional
public class RegistrationVerification {
    private final RegistrationCodeRepository codes;
    private final AppUserRepository users;
    private final PasswordHasher hasher;
    private final PasswordResetMail mail;
    private final Clock clock;
    private final boolean required;
    private final AccountSecurityEventService securityEvents;
    private final SecureRandom random = new SecureRandom();
    public RegistrationVerification(RegistrationCodeRepository codes, AppUserRepository users,
            PasswordHasher hasher, PasswordResetMail mail, Clock clock,
            @Value("${app.registration.require-email-verification:false}") boolean required,
            AccountSecurityEventService securityEvents) {
        this.codes = codes; this.users = users; this.hasher = hasher;
        this.mail = mail; this.clock = clock; this.required = required; this.securityEvents = securityEvents;
    }
    public boolean required() { return required; }
    public boolean available() { return required && mail.available(); }
    public boolean accountVerificationAvailable() { return mail.available(); }
    /** Fails before a caller reserves an email-send budget when registration OTP delivery is disabled. */
    public void requireRegistrationAvailable() {
        if (!available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Xác nhận email chưa sẵn sàng.");
    }
    /** Fails before a caller reserves an email-send budget when account verification delivery is disabled. */
    public void requireAccountVerificationAvailable() {
        if (!accountVerificationAvailable()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Xác nhận email chưa sẵn sàng.");
        }
    }
    public void request(String input) {
        requireRegistrationAvailable();
        String email = input.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) return;
        var code = codes.lockByEmail(email).orElseGet(() -> new RegistrationCode(email));
        if (!code.canSend(clock.instant())) return;
        String otp = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        code.issue(hasher.hash(otp), clock.instant());
        code = codes.saveAndFlush(code);
        try { mail.sendRegistration(email, otp); }
        catch (MailException failure) {
            code.consume();
            org.slf4j.LoggerFactory.getLogger(RegistrationVerification.class)
                    .warn("Registration email delivery failed; code invalidated.");
        }
    }

    /** Lets a signed-in legacy account prove control of its existing email without re-registering. */
    public void requestForExistingUser(Long userId) {
        requireAccountVerificationAvailable();
        AppUser user = users.lockById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (user.getEmailVerifiedAt() != null) return;
        String email = user.getEmail();
        var code = codes.lockByEmail(email).orElseGet(() -> new RegistrationCode(email));
        var now = clock.instant();
        if (!code.canSend(now)) return;
        String otp = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        code.issue(hasher.hash(otp), now);
        code = codes.saveAndFlush(code);
        try { mail.sendAccountEmailVerification(email, otp); }
        catch (MailException failure) {
            code.consume();
            org.slf4j.LoggerFactory.getLogger(RegistrationVerification.class)
                    .warn("Account email verification delivery failed; code invalidated.");
        }
    }
    @Transactional(noRollbackFor = PasswordResetService.InvalidCode.class)
    public void verify(String email, String otp) {
        if (!required) return;
        requireRegistrationAvailable();
        var code = codes.lockByEmail(email).orElseThrow(PasswordResetService.InvalidCode::new);
        if (!code.usable(clock.instant())) throw new PasswordResetService.InvalidCode();
        if (otp == null || !hasher.matches(otp, code.getCodeHash())) {
            code.failedAttempt();
            throw new PasswordResetService.InvalidCode();
        }
        code.consume();
    }

    @Transactional(noRollbackFor = PasswordResetService.InvalidCode.class)
    public void verifyExistingUser(Long userId, String otp) {
        requireAccountVerificationAvailable();
        AppUser user = users.lockById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (user.getEmailVerifiedAt() != null) return;
        var code = codes.lockByEmail(user.getEmail()).orElseThrow(PasswordResetService.InvalidCode::new);
        if (!code.usable(clock.instant())) throw new PasswordResetService.InvalidCode();
        if (!hasher.matches(otp, code.getCodeHash())) {
            code.failedAttempt();
            throw new PasswordResetService.InvalidCode();
        }
        code.consume();
        user.markEmailVerified(clock.instant());
        securityEvents.record(userId, AccountSecurityEventType.EMAIL_VERIFIED);
    }
}
