package com.selfforge.discipline.reward;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Configuration
public class AchievementDataLoader {

    @Bean
    @Order(1)
    CommandLineRunner loadAchievements(AchievementRepository achievementRepository) {
        return args -> {
            createIfMissing(achievementRepository, "FIRST_CHECKIN", "Khởi đầu", "Hoàn thành check-in đầu tiên", 10, "🌱");
            createIfMissing(achievementRepository, "STREAK_7", "Một tuần kiên định", "Duy trì streak 7 ngày liên tiếp", 50, "🔥");
            createIfMissing(achievementRepository, "STREAK_21", "Hình thành thói quen", "Duy trì streak 21 ngày liên tiếp", 150, "💪");
            createIfMissing(achievementRepository, "STREAK_30", "Một tháng bất bại", "Duy trì streak 30 ngày liên tiếp", 300, "⚡");
            createIfMissing(achievementRepository, "STREAK_60", "Chiến binh kỷ luật", "Duy trì streak 60 ngày liên tiếp", 500, "🏆");
            createIfMissing(achievementRepository, "STREAK_100", "Huyền thoại", "Duy trì streak 100 ngày liên tiếp", 1000, "👑");
            createIfMissing(achievementRepository, "PERFECT_WEEK", "Tuần hoàn hảo", "Hoàn thành 100% mục tiêu trong tuần", 100, "⭐");
            createIfMissing(achievementRepository, "TOTAL_10", "10 bước đầu", "Hoàn thành tổng cộng 10 check-in", 20, "📌");
            createIfMissing(achievementRepository, "TOTAL_50", "Nửa trăm", "Hoàn thành tổng cộng 50 check-in", 75, "📊");
            createIfMissing(achievementRepository, "TOTAL_100", "Bách chiến bách thắng", "Hoàn thành tổng cộng 100 check-in", 200, "💯");
            createIfMissing(achievementRepository, "TOTAL_500", "Nửa nghìn", "Hoàn thành tổng cộng 500 check-in", 500, "🎯");
            createIfMissing(achievementRepository, "TOTAL_1000", "Nghìn check-in", "Hoàn thành tổng cộng 1000 check-in", 1000, "🏅");
        };
    }

    private void createIfMissing(AchievementRepository repo, String code, String name, String description, int xpReward, String icon) {
        if (!repo.existsByCode(code)) {
            repo.save(new Achievement(code, name, description, xpReward, icon));
        }
    }
}
