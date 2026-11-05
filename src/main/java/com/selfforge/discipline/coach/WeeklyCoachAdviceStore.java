package com.selfforge.discipline.coach;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.insight.WeeklyInsightService;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Persists only validated AI output and the aggregate evidence fingerprint, never private journal or note text. */
@Service
public class WeeklyCoachAdviceStore {
    public record SavedAdvice(WeeklyCoachService.Advice advice, Integer helpfulnessRating,
                              WeeklyCoachFeedbackDecision followUpDecision) {}
    private final WeeklyCoachAdviceRepository advice;
    private final ObjectMapper json;
    private final Clock clock;

    public WeeklyCoachAdviceStore(WeeklyCoachAdviceRepository advice, ObjectMapper json, Clock clock) {
        this.advice = advice;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public SavedAdvice find(AppUser user, WeeklyInsightService.Snapshot snapshot, String language) {
        String fingerprint = fingerprint(snapshot);
        return advice.findByUserIdAndWeekStartAndLanguageAndEvidenceFingerprint(
                        user.getId(), snapshot.weekStart(), language, fingerprint)
                .map(this::read)
                .orElse(null);
    }

    @Transactional
    public SavedAdvice save(AppUser user, WeeklyInsightService.Snapshot snapshot,
            String language, WeeklyCoachService.Advice generated) {
        try {
            WeeklyCoachAdvice stored = advice.save(new WeeklyCoachAdvice(user, snapshot.weekStart(), language, fingerprint(snapshot),
                    generated.headline(), json.writeValueAsString(generated.observations()),
                    json.writeValueAsString(generated.experiments()), clock.instant()));
            return read(stored);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Unable to save weekly coach advice", failure);
        }
    }

    /** Idempotently removes only the saved advice bound to this user's current weekly evidence. */
    @Transactional
    public boolean delete(AppUser user, WeeklyInsightService.Snapshot snapshot, String language) {
        return advice.deleteByUserIdAndWeekStartAndLanguageAndEvidenceFingerprint(
                user.getId(), snapshot.weekStart(), language, fingerprint(snapshot)) > 0;
    }

    /** Updates only the voluntary, structured beta signal for the current evidence snapshot. */
    @Transactional
    public SavedAdvice recordFeedback(AppUser user, WeeklyInsightService.Snapshot snapshot, String language,
                                      Integer rating, WeeklyCoachFeedbackDecision decision) {
        WeeklyCoachAdvice stored = findStored(user, snapshot, language);
        stored.updateFeedback(rating, decision);
        return read(stored);
    }

    /** Clearing feedback preserves the saved suggestion and never affects the user's plan. */
    @Transactional
    public void clearFeedback(AppUser user, WeeklyInsightService.Snapshot snapshot, String language) {
        findStored(user, snapshot, language).clearFeedback();
    }

    static String fingerprint(WeeklyInsightService.Snapshot snapshot) {
        try {
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("version", snapshot.version());
            source.put("weekStart", snapshot.weekStart().toString());
            source.put("weekEnd", snapshot.weekEnd().toString());
            source.put("observedThrough", snapshot.observedThrough().toString());
            source.put("timezone", snapshot.timezone());
            source.put("completed", snapshot.completed());
            source.put("failed", snapshot.failed());
            source.put("skipped", snapshot.skipped());
            source.put("focusSessions", snapshot.focusSessions());
            source.put("focusMinutes", snapshot.focusMinutes());
            source.put("suggestion", snapshot.suggestion());
            source.put("evidence", snapshot.evidence().stream()
                    .sorted(java.util.Comparator.comparing(WeeklyInsightService.Evidence::date)
                            .thenComparing(WeeklyInsightService.Evidence::id))
                    .map(row -> List.of(row.id(), row.date().toString(), row.status().name(), row.habitId(), row.habitName()))
                    .toList());
            source.put("focusSourceIds", snapshot.focusSourceIds().stream().sorted().toList());
            byte[] encoded = new ObjectMapper().writeValueAsBytes(source);
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(encoded));
        } catch (JsonProcessingException | NoSuchAlgorithmException failure) {
            throw new IllegalStateException("Unable to fingerprint weekly coach evidence", failure);
        }
    }

    private WeeklyCoachAdvice findStored(AppUser user, WeeklyInsightService.Snapshot snapshot, String language) {
        return advice.findByUserIdAndWeekStartAndLanguageAndEvidenceFingerprint(
                user.getId(), snapshot.weekStart(), language, fingerprint(snapshot))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không có gợi ý AI khớp với dữ liệu tuần hiện tại."));
    }

    private SavedAdvice read(WeeklyCoachAdvice stored) {
        try {
            WeeklyCoachService.Observation[] observations = json.readValue(stored.getObservationsJson(), WeeklyCoachService.Observation[].class);
            String[] experiments = json.readValue(stored.getExperimentsJson(), String[].class);
            if (observations.length < 1 || observations.length > 3 || experiments.length < 1 || experiments.length > 3) {
                throw new IllegalArgumentException("Invalid saved advice");
            }
            return new SavedAdvice(new WeeklyCoachService.Advice(stored.getHeadline(), List.of(observations), List.of(experiments)),
                    stored.getHelpfulnessRating(), stored.getFollowUpDecision());
        } catch (JsonProcessingException | IllegalArgumentException failure) {
            throw new IllegalStateException("Invalid saved weekly coach advice", failure);
        }
    }
}
