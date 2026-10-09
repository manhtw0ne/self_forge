package com.selfforge.discipline;

import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.pomodoro.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:daywindow;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@Transactional
class PomodoroDayWindowTests {
    @Autowired AppUserRepository users;
    @Autowired PomodoroRepository sessions;

    @Test void repositoryIncludesStartButExcludesNextMidnightOnDstDay() {
        var user = new AppUser("day-window@example.test", "Day window", "unused");
        user.updateProfile(null, null, "America/New_York", null);
        users.save(user);
        var time = new UserTime(Clock.fixed(Instant.parse("2026-03-08T12:00:00Z"), ZoneOffset.UTC));
        var window = time.day(user, time.today(user));
        for (Instant startedAt : new Instant[]{window.start().minusMillis(1), window.start(),
                window.end().minusMillis(1), window.end()}) {
            var session = new PomodoroSession(user, null, 25, startedAt);
            session.complete("fixture", startedAt.plusSeconds(1500));
            sessions.save(session);
        }
        sessions.save(new PomodoroSession(user, null, 25, window.start().plusSeconds(3600)));
        var found = sessions.findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(
                user.getId(), window.start(), window.end());
        assertEquals(2, found.size());
        assertTrue(found.stream().allMatch(session -> !session.getStartedAt().isBefore(window.start())
                && session.getStartedAt().isBefore(window.end())));
    }
}
