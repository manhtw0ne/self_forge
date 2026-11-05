package com.selfforge.discipline.auth;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface OAuthLoginTicketRepository extends JpaRepository<OAuthLoginTicket, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select t from OAuthLoginTicket t join fetch t.user where t.ticketHash = :hash")
    Optional<OAuthLoginTicket> lockByTicketHash(@org.springframework.data.repository.query.Param("hash") String hash);
    void deleteByExpiresAtBefore(Instant instant);
}
