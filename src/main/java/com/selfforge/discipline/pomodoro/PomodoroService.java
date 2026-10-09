package com.selfforge.discipline.pomodoro;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitService;
import com.selfforge.discipline.reward.RewardService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Clock;
import com.selfforge.discipline.common.UserTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class PomodoroService {

    private static final int POMODORO_XP_BONUS = 5;

    private final PomodoroRepository pomodoroRepository;
    private final HabitService habitService;
    private final RewardService rewardService;
    private final AppUserRepository users;
    private final Clock clock;

    public PomodoroService(PomodoroRepository pomodoroRepository, HabitService habitService, RewardService rewardService,
                           AppUserRepository users, Clock clock) {
        this.pomodoroRepository = pomodoroRepository;
        this.habitService = habitService;
        this.rewardService = rewardService;
        this.users = users;
        this.clock = clock;
    }

    public PomodoroResponse startSession(AppUser user, Long habitId, Integer durationMinutes) {
        return startSession(user, habitId, durationMinutes, null);
    }

    public PomodoroResponse startSession(AppUser user, Long habitId, Integer durationMinutes, java.util.UUID requestId) {
        users.lockById(user.getId()).orElseThrow();
        int duration = durationMinutes != null ? durationMinutes : 25;
        validateDuration(duration);
        if (requestId != null) {
            var existing = pomodoroRepository.findByUserIdAndStartRequestId(user.getId(), requestId.toString());
            if (existing.isPresent()) {
                var saved = existing.get();
                Long savedHabit = saved.getHabit() == null ? null : saved.getHabit().getId();
                if (saved.getDurationMinutes() != duration || !java.util.Objects.equals(savedHabit, habitId)) {
                    throw new IllegalStateException("Request ID already used for another Pomodoro payload");
                }
                return PomodoroResponse.from(saved);
            }
        }
        Habit habit = habitId != null ? habitService.getHabit(user, habitId) : null;
        PomodoroSession session = new PomodoroSession(user, habit, duration, clock.instant());
        session.setStartRequestId(requestId == null ? null : requestId.toString());
        pomodoroRepository.save(session);
        return PomodoroResponse.from(session);
    }

    public PomodoroResponse completeSession(AppUser user, Long sessionId, String note) {
        users.lockById(user.getId()).orElseThrow();
        PomodoroSession session = pomodoroRepository.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        if (session.isCompleted()) {
            return PomodoroResponse.from(session);
        }
        validateDuration(session.getDurationMinutes());
        Instant now = clock.instant();
        if (session.getStartedAt() == null || now.isBefore(session.getStartedAt().plusSeconds(session.getDurationMinutes() * 60L))) {
            throw new IllegalStateException("Phiên tập trung chưa đủ thời gian để hoàn thành. Vui lòng tiếp tục bộ đếm.");
        }
        // The user lock serializes completion and credits: overlapping sessions cannot both earn XP.
        if (pomodoroRepository.existsByUserIdAndCompletedTrueAndEndedAtAfter(user.getId(), session.getStartedAt())) {
            throw new IllegalStateException("Khoảng thời gian này đã được tính cho một phiên tập trung khác. Hãy bắt đầu phiên mới.");
        }
        session.complete(note, now);
        rewardService.addXp(user, POMODORO_XP_BONUS);
        return PomodoroResponse.from(session);
    }

    private void validateDuration(int duration) {
        if (duration < 25 || duration > 120) {
            throw new IllegalArgumentException("Phiên tập trung nhận XP phải dài từ 25 đến 120 phút.");
        }
    }

    @Transactional(readOnly = true)
    public List<PomodoroResponse> listRecent(AppUser user) {
        return pomodoroRepository.findTop20ByUserIdOrderByStartedAtDesc(user.getId())
                .stream().map(PomodoroResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> todayStats(AppUser user) {
        UserTime userTime = new UserTime(clock);
        var day = userTime.day(user, userTime.today(user));
        List<PomodoroSession> sessions = pomodoroRepository
                .findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(user.getId(), day.start(), day.end());
        int totalSessions = sessions.size();
        int totalMinutes = sessions.stream().mapToInt(PomodoroSession::getDurationMinutes).sum();
        return Map.of(
                "totalSessions", totalSessions,
                "totalMinutes", totalMinutes,
                "xpEarned", totalSessions * POMODORO_XP_BONUS
        );
    }
}
