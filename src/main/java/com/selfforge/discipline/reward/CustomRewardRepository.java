package com.selfforge.discipline.reward;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomRewardRepository extends JpaRepository<CustomReward, Long> {

    List<CustomReward> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<CustomReward> findByUserIdAndClaimedFalseOrderByXpCostAsc(Long userId);

    Optional<CustomReward> findByIdAndUserId(Long id, Long userId);
}
