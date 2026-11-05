package com.selfforge.discipline.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/password-reset")
public class PasswordResetController {
    private final PasswordResetService service;
    private final EmailRequestLimiter limiter;
    private final ClientAddressResolver clientAddress;
    public PasswordResetController(PasswordResetService service, EmailRequestLimiter limiter, ClientAddressResolver clientAddress) { this.service = service; this.limiter = limiter; this.clientAddress = clientAddress; }
    public record EmailRequest(@NotBlank @Email @Size(max = 254) String email) {}
    public record ResetRequest(@NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = "[0-9]{6}") String code,
            @NotBlank @Size(min = PasswordPolicy.MINIMUM_LENGTH, max = 128) String newPassword,
            @NotBlank @Size(min = PasswordPolicy.MINIMUM_LENGTH, max = 128) String confirmPassword) {}

    @GetMapping("/availability")
    public Map<String, Boolean> availability() { return Map.of("enabled", service.available()); }

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> request(@Valid @RequestBody EmailRequest request, jakarta.servlet.http.HttpServletRequest servletRequest) {
        limiter.acquire(request.email(), clientAddress.resolve(servletRequest));
        service.request(request.email());
        return Map.of("message", "Nếu email đã đăng ký và đủ điều kiện gửi, bạn sẽ nhận mã. Kiểm tra cả thư rác.");
    }

    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@Valid @RequestBody ResetRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp.");
        }
        PasswordPolicy.validate(request.email(), request.newPassword());
        service.reset(request.email(), request.code(), request.newPassword());
    }
}
