package com.selfforge.discipline.pomodoro;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface PomodoroRepository extends JpaRepository<PomodoroSession, Long> {

    java.util.Optional<PomodoroSession> findByUserIdAndStartRequestId(Long userId, String startRequestId);

    boolean existsByUserIdAndCompletedTrueAndEndedAtAfter(Long userId, Instant startedAt);

    List<PomodoroSession> findTop20ByUserIdOrderByStartedAtDesc(Long userId);

    List<PomodoroSession> findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(Long userId, Instant from, Instant to);
}
