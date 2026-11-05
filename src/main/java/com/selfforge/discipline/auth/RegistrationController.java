package com.selfforge.discipline.auth;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;
@RestController
@RequestMapping("/api/auth/registration")
public class RegistrationController {
    private final RegistrationVerification verification;
    private final EmailRequestLimiter limiter;
    private final AuthService auth;
    private final ClientAddressResolver clientAddress;
    public RegistrationController(RegistrationVerification verification, EmailRequestLimiter limiter, AuthService auth, ClientAddressResolver clientAddress) { this.verification = verification; this.limiter = limiter; this.auth = auth; this.clientAddress = clientAddress; }
    @GetMapping("/availability")
    public Map<String, Boolean> availability() {
        return Map.of("required", verification.required(), "enabled", verification.available(), "inviteRequired", auth.requiresBetaInvite());
    }
    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> request(@Valid @RequestBody PasswordResetController.EmailRequest request, HttpServletRequest servletRequest) {
        limiter.acquire(request.email(), clientAddress.resolve(servletRequest));
        try { verification.request(request.email()); }
        catch (DataIntegrityViolationException concurrentRequest) {
            // A competing first request owns this email; this transaction has rolled back.
        }
        return Map.of("message", "Nếu email đủ điều kiện đăng ký, bạn sẽ nhận mã xác nhận. Kiểm tra cả thư rác.");
    }
}
