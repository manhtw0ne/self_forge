package com.selfforge.discipline.challenge;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.checkin.CheckInStatus;
import com.selfforge.discipline.checkin.DailyCheckInRepository;
import com.selfforge.discipline.habit.Habit;
import com.selfforge.discipline.habit.HabitService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static com.selfforge.discipline.challenge.ChallengeRequests.CreateChallengeRequest;
import static com.selfforge.discipline.challenge.ChallengeRequests.UpdateChallengeStatusRequest;

@Service
@Transactional
public class ChallengeService {

    private final ChallengeRepository challengeRepository;
    private final HabitService habitService;
    private final DailyCheckInRepository checkInRepository;

    public ChallengeService(
            ChallengeRepository challengeRepository,
            HabitService habitService,
            DailyCheckInRepository checkInRepository
    ) {
        this.challengeRepository = challengeRepository;
        this.habitService = habitService;
        this.checkInRepository = checkInRepository;
    }

    @Transactional(readOnly = true)
    public List<ChallengeResponse> list(AppUser user) {
        return challengeRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(ChallengeResponse::from)
                .toList();
    }

    public ChallengeResponse create(AppUser user, CreateChallengeRequest request) {
        Habit habit = habitService.getHabit(user, request.habitId());
        LocalDate startDate = request.startDate() == null ? LocalDate.now() : request.startDate();
        int targetDays = request.targetDays() == null ? 7 : request.targetDays();
        Challenge challenge = new Challenge(
                user,
                habit,
                request.name(),
                request.description(),
                startDate,
                targetDays
        );
        return ChallengeResponse.from(challengeRepository.save(challenge));
    }

    public ChallengeResponse updateStatus(AppUser user, Long id, UpdateChallengeStatusRequest request) {
        Challenge challenge = getChallenge(user, id);
        challenge.updateStatus(request.status());
        return ChallengeResponse.from(challenge);
    }

    @Transactional(readOnly = true)
    public ChallengeProgressResponse progress(AppUser user, Long id) {
        Challenge challenge = getChallenge(user, id);
        int completedDays = checkInRepository.countByHabit_User_IdAndHabitIdAndStatusAndDateBetween(
                user.getId(),
                challenge.getHabit().getId(),
                CheckInStatus.COMPLETED,
                challenge.getStartDate(),
                challenge.getEndDate()
        );
        int remainingDays = Math.max(0, challenge.getTargetDays() - completedDays);
        double completionRate = challenge.getTargetDays() == 0 ? 0 : completedDays / (double) challenge.getTargetDays();
        return new ChallengeProgressResponse(
                challenge.getId(),
                challenge.getName(),
                challenge.getHabit().getId(),
                challenge.getHabit().getName(),
                challenge.getStartDate(),
                challenge.getEndDate(),
                challenge.getTargetDays(),
                completedDays,
                remainingDays,
                Math.min(1, completionRate),
                challenge.getStatus()
        );
    }

    public void delete(AppUser user, Long id) {
        Challenge challenge = getChallenge(user, id);
        challengeRepository.delete(challenge);
    }

    private Challenge getChallenge(AppUser user, Long id) {
        return challengeRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Challenge " + id + " does not exist"));
    }
}
