package com.selfforge.discipline.pomodoro;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface PomodoroRepository extends JpaRepository<PomodoroSession, Long> {

    List<PomodoroSession> findTop20ByUserIdOrderByStartedAtDesc(Long userId);

    int countByUserIdAndCompletedTrueAndStartedAtBetween(Long userId, Instant from, Instant to);

    List<PomodoroSession> findByUserIdAndCompletedTrueAndStartedAtBetween(Long userId, Instant from, Instant to);
}
