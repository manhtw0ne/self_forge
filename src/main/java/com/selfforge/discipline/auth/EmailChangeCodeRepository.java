package com.selfforge.discipline.auth;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailChangeCodeRepository extends JpaRepository<EmailChangeCode, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from EmailChangeCode c where c.userId = :userId")
    Optional<EmailChangeCode> lockByUserId(@Param("userId") Long userId);
}
