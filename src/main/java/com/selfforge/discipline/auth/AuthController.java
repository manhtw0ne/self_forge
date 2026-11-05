package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import static com.selfforge.discipline.auth.AuthRequests.LoginRequest;
import static com.selfforge.discipline.auth.AuthRequests.RegisterRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUserService currentUserService;
    private final LoginAttemptLimiter loginAttemptLimiter;
    private final ClientAddressResolver clientAddressResolver;

    public AuthController(AuthService authService, CurrentUserService currentUserService, LoginAttemptLimiter loginAttemptLimiter,
            ClientAddressResolver clientAddressResolver) {
        this.authService = authService;
        this.currentUserService = currentUserService;
        this.loginAttemptLimiter = loginAttemptLimiter;
        this.clientAddressResolver = clientAddressResolver;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        loginAttemptLimiter.acquire(request.email(), clientAddressResolver.resolve(httpRequest));
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        loginAttemptLimiter.acquire(request.email(), clientAddressResolver.resolve(httpRequest));
        return authService.login(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        authService.logout(currentUserService.token(request));
    }

    @GetMapping("/me")
    public UserResponse me(HttpServletRequest request) {
        return UserResponse.from(currentUserService.requireUser(request));
    }
}
