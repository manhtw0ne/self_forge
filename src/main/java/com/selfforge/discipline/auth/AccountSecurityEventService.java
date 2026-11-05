package com.selfforge.discipline.auth;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stores only account-security action names and timestamps. It intentionally never accepts IP,
 * user-agent, token, email, password, OTP, or user-authored content.
 */
@Service
public class AccountSecurityEventService {
    private static final int PAGE_SIZE = 20;
    private static final int RETENTION_DAYS = 90;
    private final AccountSecurityEventRepository events;

    public AccountSecurityEventService(AccountSecurityEventRepository events) {
        this.events = events;
    }

    public void record(Long userId, AccountSecurityEventType type) {
        Instant now = Instant.now();
        events.deleteByUserIdAndOccurredAtBefore(userId, now.minus(RETENTION_DAYS, ChronoUnit.DAYS));
        events.save(new AccountSecurityEvent(userId, type, now));
    }

    @Transactional(readOnly = true)
    public Page page(Long userId, Long beforeId) {
        List<AccountSecurityEvent> rows = events.page(userId, beforeId, PageRequest.of(0, PAGE_SIZE + 1));
        boolean more = rows.size() > PAGE_SIZE;
        List<Event> items = rows.stream().limit(PAGE_SIZE)
                .map(row -> new Event(row.getId(), row.getEventType().name(), row.getOccurredAt())).toList();
        return new Page(items, more ? items.getLast().id() : null);
    }

    public record Event(Long id, String type, Instant occurredAt) {}
    public record Page(List<Event> items, Long nextCursor) {}
}
