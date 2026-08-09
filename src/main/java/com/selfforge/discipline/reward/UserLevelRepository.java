package com.selfforge.discipline.reward;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserLevelRepository extends JpaRepository<UserLevel, Long> {

    Optional<UserLevel> findByUserId(Long userId);
}
