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
                .map(this::response)
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
                        .map(this::response)
                        .orElseThrow(() -> new IllegalStateException("Thử thách của yêu cầu này đã bị xóa."));
            }
        }
        Habit habit = habitService.getActiveHabit(user, request.habitId());
        LocalDate startDate = request.startDate() == null ? userTime.today(user) : request.startDate();
        int targetDays = request.targetDays() == null ? 7 : request.targetDays();
        Challenge challenge = new Challenge(
                user,
                habit,
                request.name(),
                request.description(),
                startDate,
                targetDays,request.windowDays()==null?targetDays:request.windowDays()
        );
        int days = completedDays(challenge);
        challenge.updateStatus(resolvedStatus(challenge, days));
        challengeRepository.save(challenge);
        if (request.requestId() != null) receipts.save(new ChallengeCreateReceipt(user.getId(),
                request.requestId().toString(), fingerprint, challenge.getId()));
        return ChallengeResponse.from(challenge, challenge.getStatus(), days);
    }

    public ChallengeResponse updateStatus(AppUser user, Long id, UpdateChallengeStatusRequest request) {
        users.lockById(user.getId()).orElseThrow();
        Challenge challenge = getChallenge(user, id);
        int days = completedDays(challenge);
        if (request.status() == ChallengeStatus.COMPLETED && days < challenge.getTargetDays()) {
            throw new IllegalStateException("Thử thách chưa đủ ngày hoàn thành.");
        }
        challenge.updateStatus(request.status());
        challenge.updateStatus(resolvedStatus(challenge, days));
        return ChallengeResponse.from(challenge, challenge.getStatus(), days);
    }

    @Transactional(readOnly = true)
    public ChallengeProgressResponse progress(AppUser user, Long id) {
        Challenge challenge = getChallenge(user, id);
        int completedDays = completedDays(challenge);
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
                resolvedStatus(challenge, completedDays)
        );
    }

    @Transactional(readOnly = true)
    public ChallengeHistoryResponse history(AppUser user, Long id) {
        Challenge challenge = getChallenge(user, id);
        var entries = checkInRepository.findByHabit_User_IdAndHabitIdAndDateBetween(user.getId(), challenge.getHabit().getId(), challenge.getStartDate(), challenge.getEndDate()).stream()
            .sorted(java.util.Comparator.comparing(com.selfforge.discipline.checkin.DailyCheckIn::getDate))
            .map(row -> new ChallengeHistoryResponse.Entry(row.getId(), row.getDate(), row.getStatus())).toList();
        return new ChallengeHistoryResponse(challenge.getId(), challenge.getHabit().getId(), challenge.getStartDate(), challenge.getEndDate(), entries);
    }

    public void reconcileForHabit(AppUser user, Long habitId, LocalDate changedDate) {
        // Caller holds the user lock and has flushed the changed check-in in this transaction.
        for (Challenge challenge : challengeRepository.findByUserIdAndHabitIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                user.getId(), habitId, changedDate, changedDate)) {
            if (challenge.getStatus() != ChallengeStatus.ABANDONED) {
                challenge.updateStatus(resolvedStatus(challenge, completedDays(challenge)));
            }
        }
    }

    private ChallengeResponse response(Challenge challenge) {
        int days = completedDays(challenge);
        return ChallengeResponse.from(challenge, resolvedStatus(challenge, days), days);
    }

    private int completedDays(Challenge challenge) {
        return checkInRepository.countByHabit_User_IdAndHabitIdAndStatusAndDateBetween(
                challenge.getUser().getId(), challenge.getHabit().getId(), CheckInStatus.COMPLETED,
                challenge.getStartDate(), challenge.getEndDate());
    }

    private ChallengeStatus resolvedStatus(Challenge challenge, int days) {
        if (challenge.getStatus() == ChallengeStatus.ABANDONED) return ChallengeStatus.ABANDONED;
        return challenge.getTargetDays() > 0 && days >= challenge.getTargetDays() ? ChallengeStatus.COMPLETED : ChallengeStatus.ACTIVE;
    }

    public void delete(AppUser user, Long id) {
        users.lockById(user.getId()).orElseThrow();
        // Missing and inaccessible IDs are both no-ops; never disclose another account's resource.
        challengeRepository.findByIdAndUserId(id, user.getId()).ifPresent(challengeRepository::delete);
    }

    private String fingerprint(CreateChallengeRequest request) {
        try {
            // Preserve null date: retrying after midnight must use the original challenge date.
            int target=request.targetDays()==null?7:request.targetDays();
            int window=request.windowDays()==null?target:request.windowDays();
            var fields=new java.util.ArrayList<Object>(java.util.Arrays.asList(request.habitId(), request.name(),
                    request.description(), request.startDate() == null ? null : request.startDate().toString(),
                    target));
            // Preserve fingerprints of legacy retries when the window equals the target.
            if(window!=target)fields.add(window);
            byte[] bytes=json.writeValueAsBytes(fields);
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
