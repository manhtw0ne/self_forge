package com.selfforge.discipline.checkin;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitService;
import com.selfforge.discipline.penalty.PenaltyService;
import com.selfforge.discipline.reward.RewardService;
import com.selfforge.discipline.streak.StreakService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

import java.util.List;


import static com.selfforge.discipline.checkin.CheckInRequests.UpsertCheckInRequest;

@Service
@Transactional
public class CheckInService {

    private final UserTime userTime;

    private final DailyCheckInRepository checkInRepository;
    private final HabitService habitService;
    private final RewardService rewardService;
    private final PenaltyService penaltyService;
    private final StreakService streakService;
    private final AppUserRepository users;
    private final CheckInXpAdjustmentRepository adjustments;
    private final com.selfforge.discipline.challenge.ChallengeService challenges;

    public CheckInService(DailyCheckInRepository checkInRepository, HabitService habitService,
                          RewardService rewardService, PenaltyService penaltyService,
                          StreakService streakService, AppUserRepository users,
                          CheckInXpAdjustmentRepository adjustments, UserTime userTime,
                          com.selfforge.discipline.challenge.ChallengeService challenges) {
        this.userTime = userTime;
        this.challenges = challenges;
        this.checkInRepository = checkInRepository;
        this.habitService = habitService;
        this.rewardService = rewardService;
        this.penaltyService = penaltyService;
        this.streakService = streakService;
        this.users = users;
        this.adjustments = adjustments;
    }

    public CheckInResponse upsert(AppUser user, UpsertCheckInRequest request) {
        // Lock before reading the check-in: locking only XP is too late for duplicate requests.
        users.lockById(user.getId()).orElseThrow();
        LocalDate date = request.date() == null ? userTime.today(user) : request.date();
        if (date.isAfter(userTime.today(user))) {
            throw new IllegalArgumentException("Không thể check-in cho ngày tương lai.");
        }
        if (date.equals(LocalDate.MIN)) {
            throw new IllegalArgumentException("Ngày check-in không hợp lệ.");
        }
        Habit habit = habitService.getHabit(user, request.habitId());
        DailyCheckIn checkIn = checkInRepository.findByHabit_User_IdAndHabitIdAndDate(user.getId(), habit.getId(), date)
                .orElse(null);
        if (request.expected() != null) {
            var expected = request.expected();
            if (checkIn == null || !java.util.Objects.equals(expected.id(), checkIn.getId()) ||
                    expected.status() != checkIn.getStatus() ||
                    !java.util.Objects.equals(expected.note() == null ? "" : expected.note(), checkIn.getNote() == null ? "" : checkIn.getNote())) {
                throw new IllegalStateException("Check-in trên máy chủ đã thay đổi. Ghi chú đang nhập được giữ; tải lại trước khi sửa tiếp.");
            }
        }
        if (checkIn != null && checkIn.getStatus() == request.status()) {
            checkIn.update(request.status(), request.note());
            checkInRepository.flush();
            challenges.reconcileForHabit(user, habit.getId(), date);
            return CheckInResponse.from(checkIn);
        }
        CheckInStatus previousStatus = checkIn == null ? null : checkIn.getStatus();
        if (checkIn == null) {
            int previousStreak = streakService.endingOn(user.getId(), habit.getId(), date.minusDays(1), habit.getTargetPerWeek());
            int streakPenalty = previousStreak >= 30 ? 50 : previousStreak >= 21 ? 30 : previousStreak >= 7 ? 15 : 0;
            checkIn = new DailyCheckIn(habit, date, request.status(), request.note());
            checkIn.initializeAccounting(habit.getPoints(), Math.max(1, habit.getPoints() / 2) + streakPenalty);
            checkInRepository.save(checkIn);
        } else if (checkIn.getAppliedXp() == null) {
            throw new IllegalStateException("Check-in cũ chưa có lịch sử điểm. Cần đối soát trước khi đổi trạng thái.");
        }
        int oldEffect = checkIn.getAppliedXp();
        int desiredEffect = switch (request.status()) {
            case COMPLETED -> checkIn.getPointsSnapshot();
            case FAILED -> -checkIn.getFailurePointsSnapshot();
            case SKIPPED -> 0;
        };
        int newEffect = rewardService.replaceCheckInXp(user, oldEffect, desiredEffect);
        penaltyService.reverseCheckInPenalties(checkIn.getId());
        if (request.status() == CheckInStatus.FAILED) {
            penaltyService.recordCheckInPenalty(user, habit, checkIn.getId(), date, -newEffect);
        }
        checkIn.update(request.status(), request.note());
        checkIn.setAppliedXp(newEffect);
        adjustments.save(new CheckInXpAdjustment(checkIn, previousStatus, request.status(), newEffect - oldEffect));
        if (request.status() == CheckInStatus.COMPLETED) rewardService.checkAndGrantAchievements(user);
        checkInRepository.flush();
        challenges.reconcileForHabit(user, habit.getId(), date);
        return CheckInResponse.from(checkIn);
    }

    @Transactional(readOnly = true)
    public List<CheckInResponse> listByDate(AppUser user, LocalDate date) {
        LocalDate selectedDate = date == null ? userTime.today(user) : date;
        return checkInRepository.findByHabit_User_IdAndDateOrderByCreatedAtAsc(user.getId(), selectedDate).stream()
                .map(CheckInResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DailyCheckIn> listBetween(AppUser user, LocalDate start, LocalDate end) {
        return checkInRepository.findByHabit_User_IdAndDateBetweenOrderByDateAsc(user.getId(), start, end);
    }

    @Transactional(readOnly = true)
    public int currentStreak(AppUser user, Long habitId, LocalDate today) {
        return streakService.current(user.getId(), habitId, today);
    }

    @Transactional(readOnly = true)
    public int currentStreak(AppUser user, Long habitId, LocalDate today, int targetPerWeek) {
        return streakService.current(user.getId(), habitId, today, targetPerWeek);
    }

    @Transactional(readOnly = true)
    public int completedThisWeek(AppUser user, Long habitId, LocalDate today) {
        LocalDate start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return checkInRepository
                .findByHabit_User_IdAndHabitIdAndStatusAndDateBetween(
                        user.getId(),
                        habitId,
                        CheckInStatus.COMPLETED,
                        start,
                        today
                )
                .size();
    }


}
