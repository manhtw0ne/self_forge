package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/auth/oauth")
public class OAuthLoginController {
    private static final String TICKET_COOKIE = "sf_oauth_ticket";
    private final OAuthLoginService oauth;
    private final CurrentUserService current;
    private final PasswordHasher passwords;

    public OAuthLoginController(OAuthLoginService oauth, CurrentUserService current, PasswordHasher passwords) {
        this.oauth = oauth;
        this.current = current;
        this.passwords = passwords;
    }

    @GetMapping("/availability")
    public OAuthLoginService.Availability availability() {
        return oauth.availability();
    }

    @GetMapping("/{provider}/start")
    public void start(@PathVariable String provider, @RequestParam(required = false) String next,
            @RequestParam(required = false) Boolean termsAccepted,
            HttpServletResponse response) throws IOException {
        response.sendRedirect(oauth.begin(OAuthProvider.from(provider), next, Boolean.TRUE.equals(termsAccepted)).toString());
    }

    @PostMapping("/{provider}/native/start")
    public ResponseEntity<OAuthLoginService.NativeAuthorization> nativeStart(@PathVariable String provider,
            @RequestParam(required = false) String next, @RequestParam(required = false) Boolean termsAccepted) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .body(oauth.beginNative(OAuthProvider.from(provider), next, Boolean.TRUE.equals(termsAccepted)));
    }

    /** Starts explicit provider linking after the current password re-authenticates the signed-in account. */
    @PostMapping("/{provider}/link/start")
    public ResponseEntity<OAuthLoginService.LinkAuthorization> linkStart(@PathVariable String provider,
            @Valid @RequestBody LinkStartRequest body, HttpServletRequest request) {
        AppUser user = verifiedLinkUser(body, request);
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .body(oauth.beginLink(OAuthProvider.from(provider), body.next(), user.getId(), user.getPasswordHash()));
    }

    @PostMapping("/{provider}/native/link/start")
    public ResponseEntity<OAuthLoginService.NativeAuthorization> nativeLinkStart(@PathVariable String provider,
            @Valid @RequestBody LinkStartRequest body, HttpServletRequest request) {
        AppUser user = verifiedLinkUser(body, request);
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .body(oauth.beginNativeLink(OAuthProvider.from(provider), body.next(), user.getId(), user.getPasswordHash()));
    }

    @GetMapping("/{provider}/callback")
    public void callback(@PathVariable String provider, @RequestParam(required = false) String code,
            @RequestParam(required = false) String state, @RequestParam(required = false) String error,
            HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (error != null && !error.isBlank()) {
            redirectFailure(response, oauth.cancel(OAuthProvider.from(provider), state), "cancelled");
            return;
        }
        try {
            var result = oauth.callback(OAuthProvider.from(provider), code, state);
            if (!result.completed()) {
                redirectFailure(response, result.nativeApp(), result.failure());
                return;
            }
            if (result.nativeApp()) {
                nativeResult(response, true, result.linked());
                return;
            }
            if (result.linked()) {
                response.setHeader("Cache-Control", "no-store");
                response.sendRedirect(UriComponentsBuilder.fromPath("/profile").queryParam("oauth_linked", "1")
                        .queryParam("next", result.returnPath()).build().encode().toUriString());
                return;
            }
            response.addHeader("Set-Cookie", ticketCookie(result.ticket(), request, Duration.ofMinutes(2)).toString());
            response.sendRedirect(UriComponentsBuilder.fromPath("/login").queryParam("oauth", "1")
                    .queryParam("next", result.returnPath()).build().encode().toUriString());
        } catch (RuntimeException failure) {
            redirectFailure(response, false, "failed");
        }
    }

    @PostMapping("/complete")
    public AuthResponse complete(@CookieValue(name = TICKET_COOKIE, required = false) String ticket,
            @Valid @RequestBody(required = false) CompleteRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        try {
            if (ticket != null && body != null) throw new IllegalArgumentException("Phiên đăng nhập không hợp lệ.");
            return oauth.complete(body == null ? ticket : body.ticket());
        } finally {
            response.addHeader("Set-Cookie", ticketCookie("", request, Duration.ZERO).toString());
        }
    }

    @PostMapping("/native/complete")
    public ResponseEntity<?> completeNative(@Valid @RequestBody NativeCompleteRequest body) {
        var result = oauth.completeNative(body.handoff());
        if (!result.completed()) return ResponseEntity.status(HttpStatus.ACCEPTED)
                .header("Cache-Control", "no-store").body(new NativePendingResponse("PENDING"));
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(result.response());
    }

    @PostMapping("/native/link/complete")
    public ResponseEntity<?> completeNativeLink(@Valid @RequestBody NativeCompleteRequest body, HttpServletRequest request) {
        AppUser user = current.requireUser(request);
        var result = oauth.completeNativeLink(body.handoff(), user.getId());
        if (!result.completed()) return ResponseEntity.status(HttpStatus.ACCEPTED)
                .header("Cache-Control", "no-store").body(new NativePendingResponse("PENDING"));
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(new NativeLinkCompletionResponse("LINKED"));
    }

    private AppUser verifiedLinkUser(LinkStartRequest body, HttpServletRequest request) {
        AppUser user = current.requireUser(request);
        if (!passwords.matches(body.currentPassword(), user.getPasswordHash())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng.");
        }
        return user;
    }

    private static void redirectFailure(HttpServletResponse response, boolean nativeApp, String reason) throws IOException {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy", "no-referrer");
        if (nativeApp) {
            nativeResult(response, false, false);
            return;
        }
        response.sendRedirect("/login?oauth_error=" + reason);
    }

    private static void nativeResult(HttpServletResponse response, boolean success, boolean linked) throws IOException {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setContentType("text/html;charset=UTF-8");
        response.getWriter().write(success
                ? "<!doctype html><title>SelfForge</title><p>" + (linked ? "Liên kết đã hoàn tất." : "Đăng nhập đã hoàn tất.") + " Bạn có thể quay lại SelfForge.</p>"
                : "<!doctype html><title>SelfForge</title><p>Không thể hoàn tất đăng nhập. Hãy quay lại SelfForge và thử lại.</p>");
    }

    public record CompleteRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String ticket) {}
    public record NativeCompleteRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String handoff) {}
    public record LinkStartRequest(@NotBlank @Size(max = 1024) String currentPassword,
                                   @Size(max = 1024) String next) {}
    public record NativePendingResponse(String status) {}
    public record NativeLinkCompletionResponse(String status) {}

    private static ResponseCookie ticketCookie(String value, HttpServletRequest request, Duration maxAge) {
        String host = request.getServerName();
        boolean local = "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "::1".equals(host);
        return ResponseCookie.from(TICKET_COOKIE, value).httpOnly(true).secure(!local).sameSite("Strict")
                .path("/api/auth/oauth").maxAge(maxAge).build();
    }
}
