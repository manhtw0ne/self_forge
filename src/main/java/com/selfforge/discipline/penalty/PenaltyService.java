package com.selfforge.discipline.penalty;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.habit.Habit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class PenaltyService {

    private final PenaltyRepository penaltyRepository;

    public PenaltyService(PenaltyRepository penaltyRepository) {
        this.penaltyRepository = penaltyRepository;
    }

    public void reverseCheckInPenalties(Long checkInId) {
        penaltyRepository.findByCheckInIdAndReversedFalse(checkInId).forEach(Penalty::reverse);
    }

    public void recordCheckInPenalty(AppUser user, Habit habit, Long checkInId, LocalDate date, int actualDeduction) {
        Penalty penalty = new Penalty(user, habit, PenaltyType.SKIP_PENALTY, actualDeduction,
                "Check-in thất bại (bao gồm phạt chuỗi nếu có): " + habit.getName(), date);
        penalty.linkCheckIn(checkInId);
        penaltyRepository.save(penalty);
    }

    @Transactional(readOnly = true)
    public List<PenaltyResponse> getHistory(AppUser user) {
        return penaltyRepository.findByUserIdOrderByDateDesc(user.getId()).stream()
                .map(PenaltyResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PenaltySummary getSummary(AppUser user) {
        List<Penalty> penalties = penaltyRepository.findByUserIdOrderByDateDesc(user.getId()).stream()
                .filter(p -> !p.isReversed()).toList();
        int totalPenalties = penalties.size();
        int totalXpDeducted = penalties.stream().mapToInt(Penalty::getXpDeducted).sum();
        return new PenaltySummary(totalPenalties, totalXpDeducted);
    }

    public record PenaltySummary(int totalPenalties, int totalXpDeducted) {
    }
}
