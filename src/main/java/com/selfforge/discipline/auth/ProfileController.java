package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final CurrentUserService currentUserService;
    private final PasswordHasher passwordHasher;

    public ProfileController(CurrentUserService currentUserService, PasswordHasher passwordHasher) {
        this.currentUserService = currentUserService;
        this.passwordHasher = passwordHasher;
    }

    @GetMapping
    public UserResponse getProfile(HttpServletRequest servletRequest) {
        return UserResponse.from(currentUserService.requireUser(servletRequest));
    }

    @PatchMapping
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request, HttpServletRequest servletRequest) {
        AppUser user = currentUserService.requireUser(servletRequest);
        user.updateProfile(request.displayName(), request.avatarUrl(), request.timezone(), request.motto());
        return UserResponse.from(user);
    }

    @PatchMapping("/password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request, HttpServletRequest servletRequest) {
        AppUser user = currentUserService.requireUser(servletRequest);
        if (!passwordHasher.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Old password is incorrect");
        }
        user.updatePasswordHash(passwordHasher.hash(request.newPassword()));
    }

    public record UpdateProfileRequest(
            String displayName,
            String avatarUrl,
            String timezone,
            String motto
    ) {
    }

    public record ChangePasswordRequest(
            String oldPassword,
            String newPassword
    ) {
    }
}
