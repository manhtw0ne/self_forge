package com.selfforge.discipline.penalty;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.reward.RewardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class PenaltyService {

    private final PenaltyRepository penaltyRepository;
    private final RewardService rewardService;

    public PenaltyService(PenaltyRepository penaltyRepository, RewardService rewardService) {
        this.penaltyRepository = penaltyRepository;
        this.rewardService = rewardService;
    }

    /**
     * Apply penalty when a long streak is broken (streak was >= 7 days).
     */
    public void applyStreakBreakPenalty(AppUser user, Habit habit, int brokenStreak) {
        if (brokenStreak < 7) return; // Only penalize if streak was significant

        int xpPenalty;
        String reason;
        if (brokenStreak >= 30) {
            xpPenalty = 50;
            reason = "Mất streak " + brokenStreak + " ngày của '" + habit.getName() + "'";
        } else if (brokenStreak >= 21) {
            xpPenalty = 30;
            reason = "Mất streak " + brokenStreak + " ngày của '" + habit.getName() + "'";
        } else {
            xpPenalty = 15;
            reason = "Mất streak " + brokenStreak + " ngày của '" + habit.getName() + "'";
        }

        Penalty penalty = new Penalty(user, habit, PenaltyType.STREAK_BREAK, xpPenalty, reason, LocalDate.now());
        penaltyRepository.save(penalty);
        rewardService.deductXp(user, xpPenalty);
    }

    /**
     * Apply penalty when user fails a check-in.
     */
    public void applyFailPenalty(AppUser user, Habit habit) {
        int xpPenalty = Math.max(1, habit.getPoints() / 2);
        String reason = "Thất bại check-in '" + habit.getName() + "'";
        Penalty penalty = new Penalty(user, habit, PenaltyType.SKIP_PENALTY, xpPenalty, reason, LocalDate.now());
        penaltyRepository.save(penalty);
        rewardService.deductXp(user, xpPenalty);
    }

    @Transactional(readOnly = true)
    public List<PenaltyResponse> getHistory(AppUser user) {
        return penaltyRepository.findByUserIdOrderByDateDesc(user.getId()).stream()
                .map(PenaltyResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PenaltySummary getSummary(AppUser user) {
        List<Penalty> penalties = penaltyRepository.findByUserIdOrderByDateDesc(user.getId());
        int totalPenalties = penalties.size();
        int totalXpDeducted = penalties.stream().mapToInt(Penalty::getXpDeducted).sum();
        return new PenaltySummary(totalPenalties, totalXpDeducted);
    }

    public record PenaltySummary(int totalPenalties, int totalXpDeducted) {
    }
}
