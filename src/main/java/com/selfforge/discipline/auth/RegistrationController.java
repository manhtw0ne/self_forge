package com.selfforge.discipline.auth;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;
@RestController
@RequestMapping("/api/auth/registration")
public class RegistrationController {
    private final RegistrationVerification verification;
    public RegistrationController(RegistrationVerification verification) { this.verification = verification; }
    @GetMapping("/availability")
    public Map<String, Boolean> availability() {
        return Map.of("required", verification.required(), "enabled", verification.available());
    }
    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> request(@Valid @RequestBody PasswordResetController.EmailRequest request) {
        try { verification.request(request.email()); }
        catch (DataIntegrityViolationException concurrentRequest) {
            // A competing first request owns this email; this transaction has rolled back.
        }
        return Map.of("message", "Nếu email đủ điều kiện đăng ký, bạn sẽ nhận mã xác nhận. Kiểm tra cả thư rác.");
    }
}