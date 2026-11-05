package com.selfforge.discipline.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {

    java.util.List<AuthSession> findByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(Long userId, java.time.Instant now);

    Optional<AuthSession> findByIdAndUserId(Long id, Long userId);

    void deleteByUserIdAndTokenHashNot(Long userId, String tokenHash);

    void deleteByTokenHash(String tokenHash);

    void deleteByUserId(Long userId);

    long deleteByExpiresAtBefore(java.time.Instant cutoff);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "user")
    Optional<AuthSession> findByTokenHash(String tokenHash);
}
