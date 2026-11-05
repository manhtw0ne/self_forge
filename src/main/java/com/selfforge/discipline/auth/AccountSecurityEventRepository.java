package com.selfforge.discipline.auth;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountSecurityEventRepository extends JpaRepository<AccountSecurityEvent, Long> {
    @Query("select e from AccountSecurityEvent e where e.userId = :userId and (:beforeId is null or e.id < :beforeId) order by e.id desc")
    List<AccountSecurityEvent> page(@Param("userId") Long userId, @Param("beforeId") Long beforeId, Pageable pageable);

    @Modifying
    long deleteByUserIdAndOccurredAtBefore(Long userId, Instant cutoff);
}
