package com.selfforge.discipline.auth;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface BetaInviteRepository extends JpaRepository<BetaInvite, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invite from BetaInvite invite where invite.codeHash = :codeHash")
    Optional<BetaInvite> lockByCodeHash(@Param("codeHash") String codeHash);

    List<BetaInvite> findTop200ByOrderByIdDesc();
}
