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
    public PasswordResetController(PasswordResetService service) { this.service = service; }
    public record EmailRequest(@NotBlank @Email @Size(max = 254) String email) {}
    public record ResetRequest(@NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = "[0-9]{6}") String code,
            @NotBlank @Size(min = 8, max = 128) String newPassword,
            @NotBlank @Size(min = 8, max = 128) String confirmPassword) {}

    @GetMapping("/availability")
    public Map<String, Boolean> availability() { return Map.of("enabled", service.available()); }

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> request(@Valid @RequestBody EmailRequest request) {
        service.request(request.email());
        return Map.of("message", "Nếu email đã đăng ký và đủ điều kiện gửi, bạn sẽ nhận mã. Kiểm tra cả thư rác.");
    }

    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@Valid @RequestBody ResetRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp.");
        }
        service.reset(request.email(), request.code(), request.newPassword());
    }
}