package com.selfforge.discipline.challenge;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChallengeRepository extends JpaRepository<Challenge, Long> {

    List<Challenge> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Challenge> findByIdAndUserId(Long id, Long userId);
}
