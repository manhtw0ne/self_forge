package com.selfforge.discipline.auth;

import java.time.Instant;

public record UserResponse(
        Long id,
        String email,
        String displayName,
        String avatarUrl,
        String timezone,
        String motto,
        String language,
        boolean emailVerified,
        Instant createdAt,
        Instant termsAcceptedAt,
        String termsVersion,
        String premiumTier,
        boolean isPremium,
        Instant premiumExpiresAt
) {
    public static UserResponse from(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getTimezone(),
                user.getMotto(),
                user.getLanguage(),
                user.getEmailVerifiedAt() != null,
                user.getCreatedAt(),
                user.getTermsAcceptedAt(),
                user.getTermsVersion(),
                user.getPremiumTier().name(),
                user.isPremium(),
                user.getPremiumExpiresAt()
        );
    }
}
