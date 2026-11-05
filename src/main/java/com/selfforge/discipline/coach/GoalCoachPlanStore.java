package com.selfforge.discipline.coach;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.goal.Goal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Stores bounded plans by a one-way fingerprint of exactly the goal fields sent to the AI provider. */
@Service
public class GoalCoachPlanStore {
    private final GoalCoachPlanRepository plans;
    private final ObjectMapper json;
    private final Clock clock;

    public GoalCoachPlanStore(GoalCoachPlanRepository plans, ObjectMapper json, Clock clock) {
        this.plans = plans;
        this.json = json;
        this.clock = clock;
    }

    @Transactional
    public GoalCoachService.Plan find(AppUser user, Goal goal, String language) {
        String fingerprint = fingerprint(goal);
        plans.deleteByUserIdAndGoalIdAndEvidenceFingerprintNot(user.getId(), goal.getId(), fingerprint);
        return plans.findByUserIdAndGoalIdAndLanguageAndEvidenceFingerprint(
                        user.getId(), goal.getId(), language, fingerprint)
                .map(this::read)
                .orElse(null);
    }

    @Transactional
    public GoalCoachService.Plan save(AppUser user, Goal goal, String language, GoalCoachService.Plan generated) {
        String fingerprint = fingerprint(goal);
        plans.deleteByUserIdAndGoalIdAndEvidenceFingerprintNot(user.getId(), goal.getId(), fingerprint);
        var existing = plans.findByUserIdAndGoalIdAndLanguageAndEvidenceFingerprint(
                user.getId(), goal.getId(), language, fingerprint);
        if (existing.isPresent()) return read(existing.get());
        GoalCoachService.Plan safe = validate(generated);
        try {
            plans.save(new GoalCoachPlan(user, goal.getId(), language, fingerprint, safe.headline(),
                    json.writeValueAsString(safe.steps()), json.writeValueAsString(safe.habits()), clock.instant()));
            return safe;
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Unable to save goal coach plan", failure);
        }
    }

    /** Idempotently removes only this account's suggestion for the goal's current visible state. */
    @Transactional
    public boolean delete(AppUser user, Goal goal, String language) {
        return plans.deleteByUserIdAndGoalIdAndLanguageAndEvidenceFingerprint(
                user.getId(), goal.getId(), language, fingerprint(goal)) > 0;
    }

    public static String fingerprint(Goal goal) {
        try {
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("formatVersion", 1);
            source.put("name", goal.getName());
            source.put("description", goal.getDescription() == null ? "" : goal.getDescription());
            source.put("target", goal.getTargetValue());
            source.put("current", goal.getCurrentValue());
            source.put("remaining", Math.max(0, goal.getTargetValue() - goal.getCurrentValue()));
            source.put("unit", goal.getUnit() == null ? "" : goal.getUnit());
            source.put("deadline", goal.getDeadline() == null ? "" : goal.getDeadline().toString());
            byte[] encoded = new ObjectMapper().writeValueAsBytes(source);
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(encoded));
        } catch (JsonProcessingException | NoSuchAlgorithmException failure) {
            throw new IllegalStateException("Unable to fingerprint goal coach plan", failure);
        }
    }

    private GoalCoachService.Plan read(GoalCoachPlan stored) {
        try {
            String[] steps = json.readValue(stored.getStepsJson(), String[].class);
            GoalCoachService.HabitSuggestion[] habits = json.readValue(stored.getHabitsJson(), GoalCoachService.HabitSuggestion[].class);
            return validate(new GoalCoachService.Plan(stored.getHeadline(), List.of(steps), List.of(habits)));
        } catch (JsonProcessingException | IllegalArgumentException failure) {
            throw new IllegalStateException("Invalid saved goal coach plan", failure);
        }
    }

    private static GoalCoachService.Plan validate(GoalCoachService.Plan plan) {
        if (plan == null || !text(plan.headline(), 280) || plan.steps() == null || plan.habits() == null
                || plan.steps().size() < 1 || plan.steps().size() > 3 || plan.habits().size() < 1 || plan.habits().size() > 3) {
            throw new IllegalArgumentException("Invalid goal coach plan");
        }
        for (String step : plan.steps()) if (!text(step, 280)) throw new IllegalArgumentException("Invalid goal coach step");
        for (GoalCoachService.HabitSuggestion habit : plan.habits()) {
            if (habit == null || !text(habit.name(), 255) || !text(habit.description(), 255)
                    || habit.difficulty() == null || habit.targetPerWeek() < 1 || habit.targetPerWeek() > 7) {
                throw new IllegalArgumentException("Invalid goal coach habit");
            }
        }
        return new GoalCoachService.Plan(plan.headline().trim(), List.copyOf(plan.steps()), List.copyOf(plan.habits()));
    }

    private static boolean text(String value, int maximum) {
        return value != null && !value.isBlank() && value.trim().length() <= maximum;
    }
}
