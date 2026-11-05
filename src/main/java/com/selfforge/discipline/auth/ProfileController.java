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
import org.springframework.web.bind.annotation.RequestParam;
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
    private final AccountSecurityEventService securityEvents;
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    public ProfileController(CurrentUserService currentUserService, PasswordHasher passwordHasher, AuthSessionRepository sessions, PasswordResetCodeRepository resetCodes, AppUserRepository users, AccountSecurityEventService securityEvents) {
        this.users = users;
        this.resetCodes = resetCodes;
        this.sessions = sessions;
        this.currentUserService = currentUserService;
        this.passwordHasher = passwordHasher;
        this.securityEvents = securityEvents;
    }

    @GetMapping
    public UserResponse getProfile(HttpServletRequest servletRequest) {
        return UserResponse.from(currentUserService.requireUser(servletRequest));
    }

    @PatchMapping
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request, HttpServletRequest servletRequest) {
        AppUser user = users.lockById(currentUserService.requireUser(servletRequest).getId()).orElseThrow();
        entityManager.refresh(user);
        currentUserService.requireUser(servletRequest);
        if (request.displayName() != null && request.displayName().isBlank()) {
            throw new IllegalArgumentException("Tên hiển thị không được để trống.");
        }
        if (request.timezone() != null) {
            try { ZoneId.of(request.timezone()); }
            catch (DateTimeException e) { throw new IllegalArgumentException("Invalid timezone"); }
        }
        if (request.expected() != null) {
            var expected = request.expected();
            String timezone = user.getTimezone() == null || user.getTimezone().isBlank() ? "Asia/Ho_Chi_Minh" : user.getTimezone();
            if (!java.util.Objects.equals(expected.displayName(), user.getDisplayName()) ||
                    !text(expected.motto()).equals(text(user.getMotto())) || !java.util.Objects.equals(expected.timezone(), timezone)) {
                throw new IllegalStateException("Hồ sơ trên máy chủ đã thay đổi. Xem bản mới trước khi lưu tiếp.");
            }
        }
        user.updateProfile(request.displayName(), request.avatarUrl(), request.timezone(), request.motto());
        if (request.language() != null) user.updateLanguage(request.language());
        return UserResponse.from(user);
    }

    @GetMapping("/timezones")
    public java.util.List<String> timezones(HttpServletRequest request) {
        currentUserService.requireUser(request);
        return ZoneId.getAvailableZoneIds().stream().sorted().toList();
    }

    @PatchMapping("/password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request, HttpServletRequest servletRequest) {
        AppUser user = users.lockById(currentUserService.requireUser(servletRequest).getId()).orElseThrow();
        entityManager.refresh(user);
        currentUserService.requireUser(servletRequest);
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp.");
        }
        PasswordPolicy.validate(user.getEmail(), request.newPassword());
        if (!passwordHasher.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Old password is incorrect");
        }
        user.updatePasswordHash(passwordHasher.hash(request.newPassword()));
        sessions.deleteByUserId(user.getId());
        resetCodes.findById(user.getId()).ifPresent(PasswordResetCode::consume);
        securityEvents.record(user.getId(), AccountSecurityEventType.PASSWORD_CHANGED);
    }

    @GetMapping("/security-events")
    @Transactional(readOnly = true)
    public AccountSecurityEventService.Page securityEvents(
            @RequestParam(required = false) @jakarta.validation.constraints.Positive Long beforeId,
            HttpServletRequest servletRequest) {
        AppUser user = currentUserService.requireUser(servletRequest);
        return securityEvents.page(user.getId(), beforeId);
    }

    private static String text(String value) { return value == null ? "" : value; }
    public record ProfileSnapshot(@Size(max = 100) String displayName, @Size(max = 255) String motto, @Size(max = 100) String timezone) {}
    public record UpdateProfileRequest(
            @Size(max = 100) String displayName,
            @Size(max = 255) String avatarUrl,
            @Size(max = 100) String timezone,
            @Size(max = 255) String motto,
            @jakarta.validation.constraints.Pattern(regexp = "vi|en") String language,
            @Valid ProfileSnapshot expected
    ) {
    }

    public record ChangePasswordRequest(
            @NotBlank @Size(max = 128) String oldPassword,
            @NotBlank @Size(min = PasswordPolicy.MINIMUM_LENGTH, max = 128) String newPassword,
            @NotBlank @Size(min = PasswordPolicy.MINIMUM_LENGTH, max = 128) String confirmPassword
    ) {
    }
}
