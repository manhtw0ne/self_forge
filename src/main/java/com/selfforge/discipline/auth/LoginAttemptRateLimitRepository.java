package com.selfforge.discipline.auth;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface LoginAttemptRateLimitRepository extends JpaRepository<LoginAttemptRateLimit, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select bucket from LoginAttemptRateLimit bucket where bucket.scope = :scope")
    Optional<LoginAttemptRateLimit> lockByScope(@Param("scope") String scope);

    @Modifying
    @Query("delete from LoginAttemptRateLimit bucket where (bucket.scope like 'email:%' or bucket.scope like 'client:%') and bucket.windowStart < :cutoff")
    int deleteExpiredScopedBuckets(@Param("cutoff") Instant cutoff);
}
