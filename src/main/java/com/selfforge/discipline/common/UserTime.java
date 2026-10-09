package com.selfforge.discipline.common;

import com.selfforge.discipline.auth.AppUser;
import java.time.*;
import org.springframework.stereotype.Component;

/** Calendar dates belong to the user's profile; persisted timestamps remain instants. */
@Component
public class UserTime {
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final Clock clock;

    public UserTime(Clock clock) {
        this.clock = clock;
    }

    public ZoneId zone(AppUser user) {
        String timezone = user.getTimezone();
        if (timezone == null || timezone.isBlank()) return DEFAULT_ZONE;
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException ignored) {
            // Legacy profiles may predate timezone validation.
            return DEFAULT_ZONE;
        }
    }

    public ZonedDateTime now(AppUser user) {
        return clock.instant().atZone(zone(user));
    }

    public LocalDate today(AppUser user) {
        return now(user).toLocalDate();
    }

    public DayWindow day(AppUser user, LocalDate date) {
        ZoneId zone = zone(user);
        return new DayWindow(date.atStartOfDay(zone).toInstant(), date.plusDays(1).atStartOfDay(zone).toInstant());
    }

    public record DayWindow(Instant start, Instant end) {}
}
