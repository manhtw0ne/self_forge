package com.selfforge.discipline.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthRequests {

    private AuthRequests() {}

    public record RegisterRequest(
            @Email @NotBlank @Size(max = 254) String email,
            @NotBlank @Size(max = 100) String displayName,
            @NotBlank @Size(min = 8, max = 128) String password,
            @jakarta.validation.constraints.Pattern(regexp = "[0-9]{6}") String code
    ) {
        public RegisterRequest(String email, String displayName, String password) {
            this(email, displayName, password, null);
        }
    }

    public record LoginRequest(
            @Email @NotBlank @Size(max = 254) String email,
            @NotBlank @Size(max = 128) String password
    ) {
    }
}
