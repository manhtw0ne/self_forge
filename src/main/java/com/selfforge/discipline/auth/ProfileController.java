package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.transaction.annotation.Transactional;
import java.time.ZoneId;
import java.time.DateTimeException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@Transactional
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final CurrentUserService currentUserService;
    private final PasswordHasher passwordHasher;

    private final AuthSessionRepository sessions;
    private final PasswordResetCodeRepository resetCodes;
    private final AppUserRepository users;
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    public ProfileController(CurrentUserService currentUserService, PasswordHasher passwordHasher, AuthSessionRepository sessions, PasswordResetCodeRepository resetCodes, AppUserRepository users) {
        this.users = users;
        this.resetCodes = resetCodes;
        this.sessions = sessions;
        this.currentUserService = currentUserService;
        this.passwordHasher = passwordHasher;
    }

    @GetMapping
    public UserResponse getProfile(HttpServletRequest servletRequest) {
        return UserResponse.from(currentUserService.requireUser(servletRequest));
    }

    @PatchMapping
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request, HttpServletRequest servletRequest) {
        AppUser user = users.lockById(currentUserService.requireUser(servletRequest).getId()).orElseThrow();
        entityManager.refresh(user);
        if (request.timezone() != null && !request.timezone().isBlank()) {
            try { ZoneId.of(request.timezone()); }
            catch (DateTimeException e) { throw new IllegalArgumentException("Invalid timezone"); }
        }
        user.updateProfile(request.displayName(), request.avatarUrl(), request.timezone(), request.motto());
        return UserResponse.from(user);
    }

    @PatchMapping("/password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request, HttpServletRequest servletRequest) {
        AppUser user = users.lockById(currentUserService.requireUser(servletRequest).getId()).orElseThrow();
        entityManager.refresh(user);
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp.");
        }
        if (!passwordHasher.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Old password is incorrect");
        }
        user.updatePasswordHash(passwordHasher.hash(request.newPassword()));
        sessions.deleteByUserId(user.getId());
        resetCodes.findById(user.getId()).ifPresent(PasswordResetCode::consume);
    }

    public record UpdateProfileRequest(
            @Size(max = 100) String displayName,
            @Size(max = 255) String avatarUrl,
            @Size(max = 100) String timezone,
            @Size(max = 255) String motto
    ) {
    }

    public record ChangePasswordRequest(
            @NotBlank @Size(max = 128) String oldPassword,
            @NotBlank @Size(min = 8, max = 128) String newPassword,
            @NotBlank @Size(min = 8, max = 128) String confirmPassword
    ) {
    }
}
