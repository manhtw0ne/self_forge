package com.selfforge.discipline.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {

    void deleteByTokenHash(String tokenHash);

    void deleteByUserId(Long userId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "user")
    Optional<AuthSession> findByTokenHash(String tokenHash);
}
