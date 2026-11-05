package com.selfforge.discipline.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
class OAuthLoginTicketStore {
    record ConsumedTicket(boolean valid, Long userId) {}

    private final OAuthLoginTicketRepository tickets;
    private final AppUserRepository users;
    private final TokenService tokens;
    private final Clock clock;

    OAuthLoginTicketStore(OAuthLoginTicketRepository tickets, AppUserRepository users, TokenService tokens, Clock clock) {
        this.tickets = tickets;
        this.users = users;
        this.tokens = tokens;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    String issue(Long userId) {
        Instant now = clock.instant();
        tickets.deleteByExpiresAtBefore(now.minus(Duration.ofDays(1)));
        String raw = tokens.newToken();
        tickets.save(new OAuthLoginTicket(tokens.hash(raw), users.getReferenceById(userId), now.plus(Duration.ofMinutes(2)), now));
        return raw;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    ConsumedTicket consume(String rawTicket) {
        if (rawTicket == null || rawTicket.isBlank() || rawTicket.length() > 256) return invalid();
        OAuthLoginTicket ticket = tickets.lockByTicketHash(tokens.hash(rawTicket)).orElse(null);
        if (ticket == null) return invalid();
        tickets.delete(ticket);
        return ticket.expiresAt.isAfter(clock.instant()) ? new ConsumedTicket(true, ticket.user.getId()) : invalid();
    }

    private static ConsumedTicket invalid() {
        return new ConsumedTicket(false, null);
    }
}
