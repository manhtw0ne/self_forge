package com.selfforge.discipline.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/email-change-recovery")
public class EmailChangeRecoveryController {
    private final EmailChangeRecoveryService service;

    public EmailChangeRecoveryController(EmailChangeRecoveryService service) { this.service = service; }

    public record TokenRequest(@NotBlank @Size(max = 64) @Pattern(regexp = "[A-Za-z0-9_-]{43}") String token) {}

    @PostMapping("/check")
    public Map<String, Boolean> check(@Valid @RequestBody TokenRequest body) {
        return Map.of("valid", service.usable(body.token()));
    }

    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@Valid @RequestBody TokenRequest body) { service.recover(body.token()); }
}
