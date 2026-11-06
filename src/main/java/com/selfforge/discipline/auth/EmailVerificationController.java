package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile/email-verification")
public class EmailVerificationController {
    private final CurrentUserService current;
    private final RegistrationVerification verification;
    private final EmailRequestLimiter limiter;
    private final ClientAddressResolver clientAddress;

    public EmailVerificationController(CurrentUserService current, RegistrationVerification verification, EmailRequestLimiter limiter, ClientAddressResolver clientAddress) {
        this.current = current; this.verification = verification; this.limiter = limiter; this.clientAddress = clientAddress;
    }

    public record Confirm(@NotBlank @Pattern(regexp = "[0-9]{6}") String code) {}

    @GetMapping("/availability")
    public Map<String, Boolean> availability(HttpServletRequest request) {
        AppUser user = current.requireUser(request);
        return Map.of("enabled", verification.accountVerificationAvailable(), "verified", user.getEmailVerifiedAt() != null);
    }

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> request(HttpServletRequest request) {
        AppUser user = current.requireUser(request);
        verification.requireAccountVerificationAvailable();
        limiter.acquire(user.getEmail(), clientAddress.resolve(request));
        verification.requestForExistingUser(user.getId());
        return Map.of("message", "Nếu email tài khoản chưa xác minh và đủ điều kiện gửi, bạn sẽ nhận mã. Kiểm tra cả thư rác.");
    }

    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@Valid @RequestBody Confirm body, HttpServletRequest request) {
        verification.verifyExistingUser(current.requireUser(request).getId(), body.code());
    }
}
