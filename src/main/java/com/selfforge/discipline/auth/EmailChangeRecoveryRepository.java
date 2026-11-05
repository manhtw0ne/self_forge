package com.selfforge.discipline.auth;

import java.util.Optional;
import java.time.Instant;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailChangeRecoveryRepository extends JpaRepository<EmailChangeRecovery, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from EmailChangeRecovery r where r.tokenHash = :tokenHash")
    Optional<EmailChangeRecovery> lockByTokenHash(@Param("tokenHash") String tokenHash);

    Optional<EmailChangeRecovery> findByTokenHash(String tokenHash);

    long deleteByExpiresAtBefore(Instant cutoff);
}
