package com.selfforge.discipline.reward;

import java.time.Instant;
import java.util.List;

public final class RewardResponse {

    private RewardResponse() {
    }

    public record UserProgressResponse(
            int level,
            int totalXp,
            int currentLevelXp,
            int nextLevelXp,
            double levelProgress,
            List<EarnedAchievement> recentAchievements
    ) {
    }

    public record EarnedAchievement(
            Long id,
            String code,
            String name,
            String description,
            int xpReward,
            String iconEmoji,
            Instant earnedAt
    ) {
        public static EarnedAchievement from(UserAchievement ua) {
            Achievement a = ua.getAchievement();
            return new EarnedAchievement(
                    a.getId(), a.getCode(), a.getName(),
                    a.getDescription(), a.getXpReward(), a.getIconEmoji(),
                    ua.getEarnedAt()
            );
        }
    }

    public record AchievementListItem(
            Long id,
            String code,
            String name,
            String description,
            int xpReward,
            String iconEmoji,
            boolean earned,
            Instant earnedAt
    ) {
    }
}
