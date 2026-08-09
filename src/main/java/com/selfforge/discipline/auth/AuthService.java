package com.selfforge.discipline.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

import static com.selfforge.discipline.auth.AuthRequests.LoginRequest;
import static com.selfforge.discipline.auth.AuthRequests.RegisterRequest;

@Service
@Transactional
public class AuthService {

    private final AppUserRepository userRepository;
    private final AuthSessionRepository sessionRepository;
    private final PasswordHasher passwordHasher;
    private final TokenService tokenService;

    public AuthService(
            AppUserRepository userRepository,
            AuthSessionRepository sessionRepository,
            PasswordHasher passwordHasher,
            TokenService tokenService
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.passwordHasher = passwordHasher;
        this.tokenService = tokenService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }
        AppUser user = userRepository.save(new AppUser(
                email,
                request.displayName().trim(),
                passwordHasher.hash(request.password())
        ));
        return createSession(user);
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordHasher.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return createSession(user);
    }

    @Transactional(readOnly = true)
    public AppUser authenticate(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing auth token");
        }
        AuthSession session = sessionRepository.findByTokenHash(tokenService.hash(token))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid auth token"));
        if (session.isExpired()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Auth token has expired");
        }
        return session.getUser();
    }

    public AppUser createUserIfMissing(String email, String displayName, String password) {
        String normalizedEmail = normalizeEmail(email);
        return userRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> userRepository.save(new AppUser(
                        normalizedEmail,
                        displayName,
                        passwordHasher.hash(password)
                )));
    }

    private AuthResponse createSession(AppUser user) {
        String token = tokenService.newToken();
        Instant expiresAt = Instant.now().plus(30, ChronoUnit.DAYS);
        sessionRepository.save(new AuthSession(user, tokenService.hash(token), expiresAt));
        return new AuthResponse(token, expiresAt, UserResponse.from(user));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
