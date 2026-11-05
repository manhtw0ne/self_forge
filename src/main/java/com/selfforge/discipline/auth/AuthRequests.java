package com.selfforge.discipline.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthRequests {

    private AuthRequests() {}

    public record RegisterRequest(
            @Email @NotBlank @Size(max = 254) String email,
            @NotBlank @Size(max = 100) String displayName,
            @NotBlank @Size(min = PasswordPolicy.MINIMUM_LENGTH, max = 128) String password,
            @jakarta.validation.constraints.Pattern(regexp = "[0-9]{6}") String code,
            @Size(max = 256) String inviteCode,
            @jakarta.validation.constraints.NotNull Boolean termsAccepted
    ) {}

    public record LoginRequest(
            @Email @NotBlank @Size(max = 254) String email,
            @NotBlank @Size(max = 128) String password
    ) {
    }
}
