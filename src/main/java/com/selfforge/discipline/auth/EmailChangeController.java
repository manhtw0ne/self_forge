package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile/email-change")
public class EmailChangeController {
    private final CurrentUserService current;
    private final EmailChangeService service;
    private final EmailRequestLimiter limiter;
    private final ClientAddressResolver clientAddress;

    public EmailChangeController(CurrentUserService current, EmailChangeService service, EmailRequestLimiter limiter, ClientAddressResolver clientAddress) {
        this.current = current; this.service = service; this.limiter = limiter; this.clientAddress = clientAddress;
    }
    public record Request(@NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 128) String currentPassword) {}
    public record Confirm(@NotBlank @Pattern(regexp = "[0-9]{6}") String code) {}

    @GetMapping("/availability")
    public Map<String, Boolean> availability(HttpServletRequest request) {
        current.requireUser(request);
        return Map.of("enabled", service.available());
    }
    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> request(@Valid @RequestBody Request body, HttpServletRequest request) {
        AppUser user = current.requireUser(request);
        limiter.acquire(body.email(), clientAddress.resolve(request));
        service.request(user.getId(), body.email(), body.currentPassword());
        return Map.of("message", "Nếu email mới đủ điều kiện, bạn sẽ nhận mã xác nhận. Kiểm tra cả thư rác.");
    }
    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@Valid @RequestBody Confirm body, HttpServletRequest request) {
        service.confirm(current.requireUser(request).getId(), body.code());
    }
}
