package com.selfforge.discipline.pomodoro;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitService;
import com.selfforge.discipline.reward.RewardService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class PomodoroService {

    private static final int POMODORO_XP_BONUS = 5;

    private final PomodoroRepository pomodoroRepository;
    private final HabitService habitService;
    private final RewardService rewardService;

    public PomodoroService(PomodoroRepository pomodoroRepository, HabitService habitService, RewardService rewardService) {
        this.pomodoroRepository = pomodoroRepository;
        this.habitService = habitService;
        this.rewardService = rewardService;
    }

    public PomodoroResponse startSession(AppUser user, Long habitId, Integer durationMinutes) {
        Habit habit = habitId != null ? habitService.getHabit(user, habitId) : null;
        int duration = durationMinutes != null ? durationMinutes : 25;
        PomodoroSession session = pomodoroRepository.save(new PomodoroSession(user, habit, duration));
        return PomodoroResponse.from(session);
    }

    public PomodoroResponse completeSession(AppUser user, Long sessionId, String note) {
        PomodoroSession session = pomodoroRepository.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        session.complete(note);
        rewardService.addXp(user, POMODORO_XP_BONUS);
        return PomodoroResponse.from(session);
    }

    @Transactional(readOnly = true)
    public List<PomodoroResponse> listRecent(AppUser user) {
        return pomodoroRepository.findTop20ByUserIdOrderByStartedAtDesc(user.getId())
                .stream().map(PomodoroResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> todayStats(AppUser user) {
        Instant dayStart = LocalDate.now().atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant dayEnd = dayStart.plusSeconds(86400);
        List<PomodoroSession> sessions = pomodoroRepository
                .findByUserIdAndCompletedTrueAndStartedAtBetween(user.getId(), dayStart, dayEnd);
        int totalSessions = sessions.size();
        int totalMinutes = sessions.stream().mapToInt(PomodoroSession::getDurationMinutes).sum();
        return Map.of(
                "totalSessions", totalSessions,
                "totalMinutes", totalMinutes,
                "xpEarned", totalSessions * POMODORO_XP_BONUS
        );
    }
}
