package com.selfforge.discipline.auth;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface OAuthLoginStateRepository extends JpaRepository<OAuthLoginState, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select s from OAuthLoginState s where s.stateHash = :hash")
    Optional<OAuthLoginState> lockByStateHash(@org.springframework.data.repository.query.Param("hash") String hash);
    void deleteByExpiresAtBefore(Instant instant);
}
