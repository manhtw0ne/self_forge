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
        Habit habit = habitId != null ? habitService.getActiveHabit(user, habitId) : null;
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

    public PomodoroResponse updateNote(AppUser user, Long sessionId, String note) {
        return updateNote(user, sessionId, note, null);
    }

    public PomodoroResponse updateNote(AppUser user, Long sessionId, String note, String expectedNote) {
        users.lockById(user.getId()).orElseThrow();
        var session = pomodoroRepository.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));
        if (!session.isCompleted()) throw new IllegalStateException("Chỉ thêm ghi chú sau khi hoàn thành phiên.");
        if (expectedNote != null && !expectedNote.equals(session.getNote() == null ? "" : session.getNote())) {
            throw new IllegalStateException("Ghi chú phiên trên máy chủ đã thay đổi. Xem bản mới trước khi lưu tiếp.");
        }
        session.updateNote(note.trim());
        return PomodoroResponse.from(session);
    }

    @Transactional(readOnly = true)
    public PomodoroResponse getSession(AppUser user, Long sessionId) {
        return PomodoroResponse.from(pomodoroRepository.findById(sessionId)
                .filter(session -> session.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Session not found")));
    }

    public record HistorySummary(long total,long completed,long incomplete,long timedSessions,long minutes) {}
    public record HistoryPage(List<PomodoroResponse> items, Long nextCursor, HistorySummary summary) { }

    @Transactional(readOnly = true)
    public HistoryPage history(AppUser user, Long beforeId, Boolean completed) { return history(user,beforeId,completed,null); }

    @Transactional(readOnly = true)
    public HistoryPage history(AppUser user, Long beforeId, Boolean completed, String query) { return history(user,beforeId,completed,query,null,null); }

    @Transactional(readOnly = true)
    public HistoryPage history(AppUser user, Long beforeId, Boolean completed, String query, java.time.LocalDate fromDate, java.time.LocalDate toDate) {
        if (beforeId != null && beforeId <= 0) throw new IllegalArgumentException("Invalid history cursor");
        String term=query==null?"":query.trim();if(term.length()>100)throw new IllegalArgumentException("Search query must be at most 100 characters");
        UserTime time=new UserTime(clock);var today=time.today(user);
        if(fromDate!=null&&(fromDate.getYear()<1||fromDate.getYear()>9999||fromDate.isAfter(today))||toDate!=null&&(toDate.getYear()<1||toDate.getYear()>9999||toDate.isAfter(today))||fromDate!=null&&toDate!=null&&fromDate.isAfter(toDate))throw new IllegalArgumentException("Invalid focus history date range");
        Instant from=fromDate==null?Instant.parse("0001-01-01T00:00:00Z"):fromDate.atStartOfDay(time.zone(user)).toInstant();
        Instant to=toDate==null?Instant.parse("+10000-01-01T00:00:00Z"):toDate.plusDays(1).atStartOfDay(time.zone(user)).toInstant();
        var rows = pomodoroRepository.history(user.getId(), beforeId, completed, from, to, term, org.springframework.data.domain.PageRequest.of(0, 21));
        var items = rows.stream().limit(20).map(PomodoroResponse::from).toList();
        var totals=pomodoroRepository.historyTotals(user.getId(),completed,from,to,term);
        var summary=new HistorySummary(totals.getTotal(),totals.getCompleted(),totals.getTotal()-totals.getCompleted(),totals.getTimedSessions(),totals.getMinutes());
        return new HistoryPage(items, rows.size() > 20 ? items.getLast().id() : null,summary);
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

    public record TodayEvidence(java.time.LocalDate date, String timezone, List<FocusEvidence> sessions) {}
    public record FocusEvidence(Long id, Long habitId, int durationMinutes, java.time.Instant startedAt) {}
    @Transactional(readOnly = true)
    public TodayEvidence todayEvidence(AppUser user) {
        return dayEvidence(user,null);
    }
    @Transactional(readOnly = true)
    public TodayEvidence dayEvidence(AppUser user, java.time.LocalDate selected) {
        UserTime time = new UserTime(clock);var date=selected==null?time.today(user):selected;
        if(date.isAfter(time.today(user))||date.getYear()<1||date.getYear()>9999)throw new IllegalArgumentException("Invalid focus evidence date");
        var day=time.day(user,date);
        var sessions=pomodoroRepository.findByUserIdAndCompletedTrueAndStartedAtGreaterThanEqualAndStartedAtLessThan(user.getId(),day.start(),day.end()).stream()
            .filter(row -> row.getDurationMinutes()>=25 && row.getDurationMinutes()<=120 && (row.getHabit()==null || row.getHabit().getUser().getId().equals(user.getId())))
            .sorted(java.util.Comparator.comparing(PomodoroSession::getId))
            .map(row -> new FocusEvidence(row.getId(),row.getHabit()==null?null:row.getHabit().getId(),row.getDurationMinutes(),row.getStartedAt())).toList();
        return new TodayEvidence(date,time.zone(user).getId(),sessions);
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
