package com.selfforge.discipline.reward;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    List<UserAchievement> findByUserIdOrderByEarnedAtDesc(Long userId);

    boolean existsByUserIdAndAchievementCode(Long userId, String achievementCode);
}
