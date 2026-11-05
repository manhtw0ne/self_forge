package com.selfforge.discipline.auth;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class OAuthLoginService {
    public record Availability(boolean google, boolean facebook) {}
    record ProviderConfig(boolean enabled, String clientId, String clientSecret, String redirectUri,
            String authorizationEndpoint, String tokenEndpoint, String profileEndpoint) {}
    private record Profile(String subject, String email, String displayName) {}

    private final OAuthLoginStateStore states;
    private final OAuthLoginTicketStore tickets;
    private final OAuthNativeHandoffStore handoffs;
    private final AuthService auth;
    private final TokenService tokens;
    private final RestClient client;
    private final ProviderConfig google;
    private final ProviderConfig facebook;

    public OAuthLoginService(OAuthLoginStateStore states, OAuthLoginTicketStore tickets, OAuthNativeHandoffStore handoffs, AuthService auth,
            TokenService tokens, RestClient.Builder builder,
            @Value("${app.oauth.google.enabled:false}") boolean googleEnabled,
            @Value("${app.oauth.google.client-id:}") String googleClientId,
            @Value("${app.oauth.google.client-secret:}") String googleClientSecret,
            @Value("${app.oauth.google.redirect-uri:}") String googleRedirectUri,
            @Value("${app.oauth.facebook.enabled:false}") boolean facebookEnabled,
            @Value("${app.oauth.facebook.client-id:}") String facebookClientId,
            @Value("${app.oauth.facebook.client-secret:}") String facebookClientSecret,
            @Value("${app.oauth.facebook.redirect-uri:}") String facebookRedirectUri) {
        this.states = states;
        this.tickets = tickets;
        this.handoffs = handoffs;
        this.auth = auth;
        this.tokens = tokens;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.client = builder.requestFactory(factory).build();
        this.google = new ProviderConfig(googleEnabled, clean(googleClientId), clean(googleClientSecret), clean(googleRedirectUri),
                "https://accounts.google.com/o/oauth2/v2/auth", "https://oauth2.googleapis.com/token", "https://openidconnect.googleapis.com/v1/userinfo");
        this.facebook = new ProviderConfig(facebookEnabled, clean(facebookClientId), clean(facebookClientSecret), clean(facebookRedirectUri),
                "https://www.facebook.com/v20.0/dialog/oauth", "https://graph.facebook.com/v20.0/oauth/access_token", "https://graph.facebook.com/me");
        validateEnabledProvider("Google", this.google);
        validateEnabledProvider("Facebook", this.facebook);
    }

    public Availability availability() {
        // Social providers cannot safely collect the closed-beta invitation code.
        // Existing OAuth identities can still complete a direct callback, but the
        // public sign-in screen must not advertise a new-account bypass.
        if (auth.requiresBetaInvite()) return new Availability(false, false);
        return new Availability(available(OAuthProvider.GOOGLE), available(OAuthProvider.FACEBOOK));
    }

    public URI begin(OAuthProvider provider, String returnPath) {
        return begin(provider, returnPath, false);
    }

    public URI begin(OAuthProvider provider, String returnPath, boolean termsAccepted) {
        ProviderConfig config = configured(provider);
        return authorizationUrl(provider, config, returnPath, null, termsAccepted);
    }

    public NativeAuthorization beginNative(OAuthProvider provider, String returnPath) {
        return beginNative(provider, returnPath, false);
    }

    public NativeAuthorization beginNative(OAuthProvider provider, String returnPath, boolean termsAccepted) {
        ProviderConfig config = configured(provider);
        var handoff = handoffs.create();
        return new NativeAuthorization(authorizationUrl(provider, config, returnPath, handoff.hash(), termsAccepted), handoff.raw());
    }

    private URI authorizationUrl(OAuthProvider provider, ProviderConfig config, String returnPath, String nativeHandoffHash,
            boolean termsAccepted) {
        String verifier = provider == OAuthProvider.GOOGLE ? tokens.newToken() : null;
        String state = states.create(provider, verifier, safeReturnPath(returnPath), nativeHandoffHash, termsAccepted);
        var url = UriComponentsBuilder.fromUriString(config.authorizationEndpoint())
                .queryParam("client_id", config.clientId())
                .queryParam("redirect_uri", config.redirectUri())
                .queryParam("response_type", "code")
                .queryParam("state", state);
        if (provider == OAuthProvider.GOOGLE) {
            url.queryParam("scope", "openid email profile").queryParam("code_challenge", codeChallenge(verifier))
                    .queryParam("code_challenge_method", "S256").queryParam("prompt", "select_account");
        } else {
            url.queryParam("scope", "email,public_profile");
        }
        return url.build().encode().toUri();
    }

    public CallbackResult callback(OAuthProvider provider, String code, String rawState) {
        var state = states.consume(provider, rawState);
        if (!state.valid()) throw invalidState();
        boolean nativeApp = state.nativeHandoffHash() != null;
        if (code == null || code.isBlank() || code.length() > 4096) {
            if (nativeApp) handoffs.discard(state.nativeHandoffHash());
            return new CallbackResult(false, null, state.returnPath(), nativeApp, "failed");
        }
        try {
            ProviderConfig config = configured(provider);
            Profile profile = profile(provider, config, code, state.verifier());
            AppUser user = auth.authenticateWithOAuth(provider, profile.subject(), profile.email(), profile.displayName(), state.termsAccepted());
            if (nativeApp) {
                handoffs.complete(state.nativeHandoffHash(), user.getId());
                return new CallbackResult(true, null, state.returnPath(), true, null);
            }
            return new CallbackResult(true, tickets.issue(user.getId()), state.returnPath(), false, null);
        } catch (AuthService.TermsRequired failure) {
            if (nativeApp) handoffs.discard(state.nativeHandoffHash());
            return new CallbackResult(false, null, state.returnPath(), nativeApp, "terms_required");
        } catch (RuntimeException failure) {
            if (nativeApp) handoffs.discard(state.nativeHandoffHash());
            return new CallbackResult(false, null, state.returnPath(), nativeApp, "failed");
        }
    }

    public boolean cancel(OAuthProvider provider, String rawState) {
        var state = states.consume(provider, rawState);
        if (!state.valid() || state.nativeHandoffHash() == null) return false;
        handoffs.discard(state.nativeHandoffHash());
        return true;
    }

    public AuthResponse complete(String rawTicket) {
        var ticket = tickets.consume(rawTicket);
        if (!ticket.valid()) throw invalidTicket();
        return auth.createOAuthSession(ticket.userId());
    }

    public NativeCompletion completeNative(String rawHandoff) {
        var handoff = handoffs.consume(rawHandoff);
        if (handoff.status() == OAuthNativeHandoffStore.Status.INVALID) throw invalidTicket();
        if (handoff.status() == OAuthNativeHandoffStore.Status.PENDING) return new NativeCompletion(false, null);
        return new NativeCompletion(true, auth.createOAuthSession(handoff.userId()));
    }

    private Profile profile(OAuthProvider provider, ProviderConfig config, String code, String verifier) {
        try {
            var body = new LinkedMultiValueMap<String, String>();
            body.add("client_id", config.clientId());
            body.add("client_secret", config.clientSecret());
            body.add("redirect_uri", config.redirectUri());
            body.add("code", code);
            body.add("grant_type", "authorization_code");
            if (provider == OAuthProvider.GOOGLE) body.add("code_verifier", verifier);
            JsonNode token = client.post().uri(config.tokenEndpoint()).contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body).retrieve().body(JsonNode.class);
            String accessToken = token == null ? null : token.path("access_token").asText(null);
            if (accessToken == null || accessToken.isBlank()) throw failedProvider();
            JsonNode identity;
            if (provider == OAuthProvider.FACEBOOK) {
                URI endpoint = UriComponentsBuilder.fromUriString(config.profileEndpoint()).queryParam("fields", "id,name,email")
                        .queryParam("access_token", accessToken).build().encode().toUri();
                identity = client.get().uri(endpoint).retrieve().body(JsonNode.class);
            } else {
                identity = client.get().uri(config.profileEndpoint()).headers(headers -> headers.setBearerAuth(accessToken)).retrieve().body(JsonNode.class);
            }
            String email = identity == null ? null : identity.path("email").asText(null);
            String subject = identity == null ? null : (provider == OAuthProvider.GOOGLE ? identity.path("sub").asText(null) : identity.path("id").asText(null));
            boolean verified = provider != OAuthProvider.GOOGLE || identity.path("email_verified").asBoolean(false);
            if (!verified || !validEmail(email) || !validSubject(subject)) throw failedProvider();
            String name = identity.path("name").asText("").trim();
            if (name.isEmpty()) name = email.substring(0, email.indexOf('@'));
            return new Profile(subject.trim(), email.trim(), name.length() > 100 ? name.substring(0, 100) : name);
        } catch (RestClientException | IllegalArgumentException failure) {
            throw failedProvider();
        }
    }

    static String safeReturnPath(String candidate) {
        if (candidate == null || candidate.isBlank() || candidate.length() > 1024 || !candidate.startsWith("/")
                || candidate.startsWith("//") || candidate.contains("\\") || candidate.startsWith("/api/")
                || candidate.startsWith("/login")) return "/";
        return candidate;
    }

    private ProviderConfig configured(OAuthProvider provider) {
        if (!available(provider)) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Nhà cung cấp đăng nhập chưa được cấu hình.");
        return config(provider);
    }

    private boolean available(OAuthProvider provider) {
        ProviderConfig config = config(provider);
        return configuredFieldsAreValid(config);
    }

    private static void validateEnabledProvider(String name, ProviderConfig config) {
        if (config.enabled() && !configuredFieldsAreValid(config)) {
            throw new IllegalArgumentException(name + " OAuth is enabled but its client ID, client secret, or HTTPS redirect URI is invalid");
        }
    }

    private static boolean configuredFieldsAreValid(ProviderConfig config) {
        return config.enabled() && !config.clientId().isBlank() && !config.clientSecret().isBlank() && validRedirectUri(config.redirectUri());
    }

    private ProviderConfig config(OAuthProvider provider) {
        return provider == OAuthProvider.GOOGLE ? google : facebook;
    }

    private static String clean(String value) { return value == null ? "" : value.trim(); }
    private static boolean validEmail(String value) {
        return value != null && value.length() <= 254 && value.indexOf('@') > 0 && value.indexOf('@') < value.length() - 3 && !value.chars().anyMatch(Character::isWhitespace);
    }
    private static boolean validSubject(String value) {
        return value != null && !value.isBlank() && value.length() <= 255 && !value.chars().anyMatch(Character::isISOControl);
    }
    private static boolean validRedirectUri(String value) {
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            if (host == null || host.isBlank() || uri.getUserInfo() != null || uri.getFragment() != null) return false;
            return "https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && ("localhost".equals(host) || "127.0.0.1".equals(host)));
        } catch (IllegalArgumentException failure) { return false; }
    }
    private static String codeChallenge(String verifier) {
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
        } catch (Exception failure) { throw new IllegalStateException("Không tạo được mã xác thực đăng nhập."); }
    }
    private ResponseStatusException failedProvider() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không xác minh được tài khoản mạng xã hội.");
    }
    private ResponseStatusException invalidTicket() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên hoàn tất đăng nhập không hợp lệ hoặc đã hết hạn.");
    }
    private ResponseStatusException invalidState() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập mạng xã hội không hợp lệ hoặc đã hết hạn.");
    }

    public record CallbackResult(boolean completed, String ticket, String returnPath, boolean nativeApp, String failure) {}
    public record NativeAuthorization(URI authorizationUrl, String handoff) {}
    public record NativeCompletion(boolean completed, AuthResponse response) {}
}
