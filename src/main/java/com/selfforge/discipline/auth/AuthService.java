package com.selfforge.discipline.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
    private final RegistrationVerification registrationVerification;
    private final OAuthIdentityRepository oauthIdentities;
    private final AccountSecurityEventService securityEvents;
    private final BetaInviteService managedInvites;
    private final String termsVersion;
    private final byte[] betaInviteCode;
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    public AuthService(
            AppUserRepository userRepository,
            AuthSessionRepository sessionRepository,
            PasswordHasher passwordHasher,
            TokenService tokenService,
            RegistrationVerification registrationVerification,
            OAuthIdentityRepository oauthIdentities,
            AccountSecurityEventService securityEvents,
            BetaInviteService managedInvites,
            @org.springframework.beans.factory.annotation.Value("${app.legal.terms-version:2026-10-28}") String termsVersion,
            @org.springframework.beans.factory.annotation.Value("${app.registration.invite-code:}") String betaInviteCode
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.passwordHasher = passwordHasher;
        this.tokenService = tokenService;
        this.registrationVerification = registrationVerification;
        this.oauthIdentities = oauthIdentities;
        this.securityEvents = securityEvents;
        this.managedInvites = managedInvites;
        if (termsVersion == null || termsVersion.isBlank() || termsVersion.length() > 32) {
            throw new IllegalArgumentException("Invalid terms version configuration");
        }
        this.termsVersion = termsVersion;
        String normalizedInviteCode = betaInviteCode == null ? "" : betaInviteCode.trim();
        if (normalizedInviteCode.length() > 256) throw new IllegalArgumentException("Invalid beta invite configuration");
        this.betaInviteCode = normalizedInviteCode.getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(noRollbackFor = PasswordResetService.InvalidCode.class)
    public AuthResponse register(RegisterRequest request) {
        requireTerms(request.termsAccepted());
        String managedInviteCode = reserveBetaInvite(request.inviteCode());
        String email = normalizeEmail(request.email());
        PasswordPolicy.validate(email, request.password());
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }
        registrationVerification.verify(email, request.code());
        if (managedInviteCode != null && !managedInvites.consume(managedInviteCode)) {
            // The reservation lock makes this defensive branch unreachable in
            // normal operation, but keep the closed-beta boundary fail-safe.
            throw new BetaInviteRequired();
        }
        AppUser user = new AppUser(
                email,
                request.displayName().trim(),
                passwordHasher.hash(request.password())
        );
        user.acceptTerms(termsVersion, Instant.now());
        user = userRepository.save(user);
        if (registrationVerification.required()) user.markEmailVerified(Instant.now());
        securityEvents.record(user.getId(), AccountSecurityEventType.REGISTERED);
        return createSession(user, null);
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        AppUser user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Do comparable PBKDF2 work before returning the same public error
            // as a wrong password, reducing account-existence timing signals.
            passwordHasher.consumeMissingAccountWork(request.password());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        user = userRepository.lockById(user.getId()).orElseThrow();
        entityManager.refresh(user);
        if (!passwordHasher.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return createSession(user, AccountSecurityEventType.SIGNED_IN);
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

    /** The browser may learn only whether beta access is gated, never the configured value. */
    public boolean requiresBetaInvite() {
        return betaInviteCode.length > 0 || managedInvites.enabled();
    }

    @Transactional
    public AppUser authenticateWithOAuth(OAuthProvider provider, String providerSubject, String email, String displayName,
            boolean termsAccepted) {
        if (providerSubject == null || providerSubject.isBlank() || providerSubject.length() > 255) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không xác minh được tài khoản mạng xã hội.");
        }
        OAuthIdentity identity = oauthIdentities.lockByProviderAndSubject(provider, providerSubject).orElse(null);
        if (identity != null) {
            AppUser linked = userRepository.lockById(identity.user.getId()).orElseThrow();
            entityManager.refresh(linked);
            if (linked.getEmailVerifiedAt() == null) linked.markEmailVerified(Instant.now());
            return linked;
        }
        String normalizedEmail = normalizeEmail(email);
        AppUser user = userRepository.findByEmail(normalizedEmail).orElse(null);
        // A provider-supplied email is not proof that the caller controls a
        // pre-existing SelfForge account. Linking requires its own re-auth flow.
        if (user != null) throw new OAuthAccountLinkRequired();
        requireTerms(termsAccepted);
        // OAuth cannot carry the invitation secret through a provider redirect.
        // Keep it disabled for new accounts while a closed beta is gated.
        if (requiresBetaInvite()) throw new BetaInviteRequired();
        user = new AppUser(normalizedEmail, displayName, passwordHasher.hash(tokenService.newToken()));
        user.acceptTerms(termsVersion, Instant.now());
        user = userRepository.save(user);
        OAuthIdentity existingProvider = oauthIdentities.lockByProviderAndUserId(provider, user.getId()).orElse(null);
        if (existingProvider == null) {
            oauthIdentities.save(new OAuthIdentity(provider, providerSubject, user, Instant.now()));
        } else if (!providerSubject.equals(existingProvider.providerSubject)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không xác minh được tài khoản mạng xã hội.");
        }
        if (user.getEmailVerifiedAt() == null) user.markEmailVerified(Instant.now());
        return user;
    }

    @Transactional
    public AuthResponse createOAuthSession(Long userId) {
        AppUser user = userRepository.lockById(userId).orElseThrow();
        return createSession(user, AccountSecurityEventType.SIGNED_IN_WITH_OAUTH);
    }

    /** Links a verified provider subject only after a separately re-authenticated account flow. */
    @Transactional
    public void linkOAuthIdentity(Long userId, OAuthProvider provider, String providerSubject, String credentialHash) {
        if (userId == null || userId < 1 || providerSubject == null || providerSubject.isBlank()
                || providerSubject.length() > 255 || credentialHash == null || credentialHash.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không xác minh được tài khoản mạng xã hội.");
        }
        AppUser user = userRepository.lockById(userId).orElseThrow();
        if (!MessageDigest.isEqual(tokenService.hash(user.getPasswordHash()).getBytes(StandardCharsets.UTF_8),
                credentialHash.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên liên kết đã hết hiệu lực.");
        }
        OAuthIdentity subjectIdentity = oauthIdentities.lockByProviderAndSubject(provider, providerSubject).orElse(null);
        if (subjectIdentity != null) {
            if (!subjectIdentity.user.getId().equals(userId)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không xác minh được tài khoản mạng xã hội.");
            }
            return;
        }
        OAuthIdentity providerIdentity = oauthIdentities.lockByProviderAndUserId(provider, userId).orElse(null);
        if (providerIdentity != null) {
            if (!providerSubject.equals(providerIdentity.providerSubject)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Tài khoản đã liên kết nhà cung cấp này.");
            }
            return;
        }
        oauthIdentities.save(new OAuthIdentity(provider, providerSubject, user, Instant.now()));
    }

    public void logout(String token) {
        if (token != null && !token.isBlank()) {
            sessionRepository.deleteByTokenHash(tokenService.hash(token));
        }
    }

    private AuthResponse createSession(AppUser user, AccountSecurityEventType eventType) {
        String token = tokenService.newToken();
        Instant expiresAt = Instant.now().plus(30, ChronoUnit.DAYS);
        sessionRepository.save(new AuthSession(user, tokenService.hash(token), expiresAt));
        if (eventType != null) securityEvents.record(user.getId(), eventType);
        return new AuthResponse(token, expiresAt, UserResponse.from(user));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static void requireTerms(Boolean accepted) {
        if (!Boolean.TRUE.equals(accepted)) throw new TermsRequired();
    }

    private String reserveBetaInvite(String suppliedCode) {
        if (!requiresBetaInvite()) return null;
        byte[] supplied = (suppliedCode == null ? "" : suppliedCode.trim()).getBytes(StandardCharsets.UTF_8);
        if (betaInviteCode.length > 0 && MessageDigest.isEqual(betaInviteCode, supplied)) return null;
        if (managedInvites.reserve(suppliedCode)) return suppliedCode;
        throw new BetaInviteRequired();
    }

    /** Separates an explicit, required consent error from a provider verification failure. */
    public static final class TermsRequired extends ResponseStatusException {
        public TermsRequired() {
            super(HttpStatus.BAD_REQUEST, "Bạn cần đồng ý Điều khoản sử dụng và Thông báo quyền riêng tư.");
        }
    }

    /** Prevents account takeover through a provider email that matches a local account. */
    public static final class OAuthAccountLinkRequired extends ResponseStatusException {
        public OAuthAccountLinkRequired() {
            super(HttpStatus.CONFLICT, "Email này đã có tài khoản. Hãy đăng nhập tài khoản đó để liên kết phương thức mới.");
        }
    }

    public static final class BetaInviteRequired extends ResponseStatusException {
        public BetaInviteRequired() {
            super(HttpStatus.FORBIDDEN, "SelfForge beta hiện yêu cầu mã mời.");
        }
    }
}
