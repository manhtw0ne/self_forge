package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/profile/sessions")
@Transactional
public class SessionController {
    private final CurrentUserService current;
    private final AppUserRepository users;
    private final AuthSessionRepository sessions;
    private final TokenService tokens;

    public SessionController(CurrentUserService current, AppUserRepository users,
                             AuthSessionRepository sessions, TokenService tokens) {
        this.current = current; this.users = users; this.sessions = sessions; this.tokens = tokens;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<SessionView> list(HttpServletRequest request) {
        var user = current.requireUser(request);
        String hash = tokens.hash(current.token(request));
        return sessions.findByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(user.getId(), Instant.now())
                .stream().map(s -> new SessionView(s.getId(), s.getCreatedAt(), s.getExpiresAt(),
                        s.getTokenHash().equals(hash))).toList();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable Long id, HttpServletRequest request) {
        Long userId = lockAndAuthenticate(request);
        sessions.findByIdAndUserId(id, userId).ifPresent(sessions::delete);
    }

    @DeleteMapping("/others")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeOthers(HttpServletRequest request) {
        Long userId = lockAndAuthenticate(request);
        sessions.deleteByUserIdAndTokenHashNot(userId, tokens.hash(current.token(request)));
    }

    private Long lockAndAuthenticate(HttpServletRequest request) {
        Long id = current.requireUser(request).getId();
        users.lockById(id).orElseThrow();
        // Recheck after waiting for a simultaneous password change or session revocation.
        current.requireUser(request);
        return id;
    }

    public record SessionView(Long id, Instant createdAt, Instant expiresAt, boolean current) {}
}
