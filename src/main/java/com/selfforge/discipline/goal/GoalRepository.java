package com.selfforge.discipline.goal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GoalRepository extends JpaRepository<Goal, Long> {

    long countByUserIdAndStatus(Long userId, GoalStatus status);

    List<Goal> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Goal> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, GoalStatus status);

    Optional<Goal> findByIdAndUserId(Long id, Long userId);
}
