package com.selfforge.discipline.challenge;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.common.UserTime;
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

    private final UserTime userTime;
    private final com.selfforge.discipline.auth.AppUserRepository users;
    private final ChallengeCreateReceiptRepository receipts;
    private final com.fasterxml.jackson.databind.ObjectMapper json;

    private final ChallengeRepository challengeRepository;
    private final HabitService habitService;
    private final DailyCheckInRepository checkInRepository;

    public ChallengeService(
            ChallengeRepository challengeRepository,
            HabitService habitService,
            DailyCheckInRepository checkInRepository
    , UserTime userTime, com.selfforge.discipline.auth.AppUserRepository users,
      ChallengeCreateReceiptRepository receipts, com.fasterxml.jackson.databind.ObjectMapper json) {
        this.users = users; this.receipts = receipts; this.json = json;
        this.userTime = userTime;
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
        users.lockById(user.getId()).orElseThrow();
        String fingerprint = fingerprint(request);
        if (request.requestId() != null) {
            var prior = receipts.findByUserIdAndRequestId(user.getId(), request.requestId().toString());
            if (prior.isPresent()) {
                if (!prior.get().getFingerprint().equals(fingerprint)) {
                    throw new IllegalStateException("Mã yêu cầu đã được dùng cho thử thách khác.");
                }
                return challengeRepository.findByIdAndUserId(prior.get().getChallengeId(), user.getId())
                        .map(ChallengeResponse::from)
                        .orElseThrow(() -> new IllegalStateException("Thử thách của yêu cầu này đã bị xóa."));
            }
        }
        Habit habit = habitService.getHabit(user, request.habitId());
        LocalDate startDate = request.startDate() == null ? userTime.today(user) : request.startDate();
        int targetDays = request.targetDays() == null ? 7 : request.targetDays();
        Challenge challenge = new Challenge(
                user,
                habit,
                request.name(),
                request.description(),
                startDate,
                targetDays
        );
        challengeRepository.save(challenge);
        if (request.requestId() != null) receipts.save(new ChallengeCreateReceipt(user.getId(),
                request.requestId().toString(), fingerprint, challenge.getId()));
        return ChallengeResponse.from(challenge);
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
        users.lockById(user.getId()).orElseThrow();
        // Missing and inaccessible IDs are both no-ops; never disclose another account's resource.
        challengeRepository.findByIdAndUserId(id, user.getId()).ifPresent(challengeRepository::delete);
    }

    private String fingerprint(CreateChallengeRequest request) {
        try {
            // Preserve null date: retrying after midnight must use the original challenge date.
            byte[] bytes = json.writeValueAsBytes(new Object[]{request.habitId(), request.name(),
                    request.description(), request.startDate() == null ? null : request.startDate().toString(),
                    request.targetDays() == null ? 7 : request.targetDays()});
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (java.io.IOException | java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("Cannot fingerprint challenge request", e);
        }
    }

    private Challenge getChallenge(AppUser user, Long id) {
        return challengeRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Challenge " + id + " does not exist"));
    }
}
