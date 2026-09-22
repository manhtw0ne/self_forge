package com.selfforge.discipline.auth;

import com.selfforge.discipline.goal.GoalRepository;
import com.selfforge.discipline.goal.GoalStatus;
import com.selfforge.discipline.habit.HabitRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

/**
 * Manages premium subscription status and provides usage limits info.
 */
@RestController
@RequestMapping("/api/premium")
public class PremiumController {

    private final CurrentUserService currentUserService;
    private final HabitRepository habitRepository;
    private final GoalRepository goalRepository;

    public PremiumController(CurrentUserService currentUserService,
                             HabitRepository habitRepository,
                             GoalRepository goalRepository) {
        this.currentUserService = currentUserService;
        this.habitRepository = habitRepository;
        this.goalRepository = goalRepository;
    }

    /** Free-tier limits */
    public static final int FREE_MAX_HABITS = 10;
    public static final int FREE_MAX_GOALS = 3;
    public static final int FREE_JOURNAL_DAYS = 7;
    public static final int FREE_MOOD_DAYS = 7;
    public static final int FREE_FREEZE_PER_MONTH = 1;
    public static final int PREMIUM_FREEZE_PER_MONTH = 5;

    /**
     * Returns the current user's premium status and usage limits.
     */
    @GetMapping("/status")
    public PremiumStatusResponse status(HttpServletRequest request) {
        AppUser user = currentUserService.requireUser(request);

        int activeHabits = habitRepository.findByUserIdAndActiveTrueOrderByCreatedAtAsc(user.getId()).size();
        long activeGoals = goalRepository.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), GoalStatus.ACTIVE).size();

        boolean premium = user.isPremium();

        return new PremiumStatusResponse(
                user.getPremiumTier().name(),
                premium,
                user.getPremiumExpiresAt(),
                new UsageLimits(
                        premium ? -1 : FREE_MAX_HABITS,
                        activeHabits,
                        premium ? -1 : FREE_MAX_GOALS,
                        (int) activeGoals,
                        premium ? -1 : FREE_JOURNAL_DAYS,
                        premium ? -1 : FREE_MOOD_DAYS,
                        premium ? PREMIUM_FREEZE_PER_MONTH : FREE_FREEZE_PER_MONTH
                )
        );
    }

    /**
     * Client-side activation stays disabled until verified billing is implemented.
     */
    @PostMapping("/activate")
    public PremiumStatusResponse activate(@RequestBody ActivateRequest req, HttpServletRequest request) {
        currentUserService.requireUser(request);
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Premium activation requires a verified payment integration");
    }

    public record ActivateRequest(String tier, Integer days) {}

    public record PremiumStatusResponse(
            String premiumTier,
            boolean isPremium,
            Instant premiumExpiresAt,
            UsageLimits limits
    ) {}

    public record UsageLimits(
            int maxHabits,
            int currentHabits,
            int maxGoals,
            int currentGoals,
            int journalDays,
            int moodDays,
            int freezePerMonth
    ) {}
}
