package com.selfforge.discipline.coach;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.goal.Goal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class GoalCoachPlanStoreTests {
    private Goal goal(String description) {
        return new Goal(new AppUser("goal-plan@example.com", "Goal plan", "hash"),
                "Read books", description, 12, "books", LocalDate.parse("2026-12-31"));
    }

    @Test void fingerprintIsStableForOneGoalStateAndChangesWithSentGoalFields() {
        assertEquals(GoalCoachPlanStore.fingerprint(goal("One book each month")),
                GoalCoachPlanStore.fingerprint(goal("One book each month")));
        assertNotEquals(GoalCoachPlanStore.fingerprint(goal("One book each month")),
                GoalCoachPlanStore.fingerprint(goal("One chapter each month")));
    }
}
