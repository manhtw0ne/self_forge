package com.selfforge.discipline.auth;

import java.util.Optional;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;

interface OAuthNativeHandoffRepository extends JpaRepository<OAuthNativeHandoff, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select h from OAuthNativeHandoff h left join fetch h.user where h.handoffHash = :hash")
    Optional<OAuthNativeHandoff> lockByHandoffHash(@org.springframework.data.repository.query.Param("hash") String hash);
    void deleteByExpiresAtBefore(Instant instant);
}
