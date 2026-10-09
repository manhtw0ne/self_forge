package com.selfforge.discipline;

import com.selfforge.discipline.goal.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class GoalRulesTests {
    @Test void restoringAbandonedGoalKeepsProgressButDoesNotReopenCompletedGoal() {
        var goal = new Goal(null, "Read", null, 10, null, null);
        goal.addProgress(4);
        goal.abandon();
        goal.restore(); goal.restore();
        assertEquals(4, goal.getCurrentValue());
        assertEquals(GoalStatus.ACTIVE, goal.getStatus());
        goal.addProgress(6);
        assertThrows(IllegalStateException.class, goal::restore);
        assertEquals(GoalStatus.COMPLETED, goal.getStatus());
    }
    @Test void largeProgressCannotOverflow() {
        var goal = new Goal(null, "Read", null, Integer.MAX_VALUE, null, null);
        goal.addProgress(Integer.MAX_VALUE - 1);
        goal.addProgress(Integer.MAX_VALUE);
        assertEquals(Integer.MAX_VALUE, goal.getCurrentValue());
        assertEquals(GoalStatus.COMPLETED, goal.getStatus());
        assertEquals(1.0, goal.getProgress());
    }

    @Test void loweringTargetPreservesActualWorkAndCompletesGoal() {
        var goal = new Goal(null, "Read", null, 10, null, null);
        goal.addProgress(8);
        goal.update(null, null, 5, null, null);
        assertEquals(8, goal.getCurrentValue());
        assertEquals(1.0, goal.getProgress());
        assertEquals(GoalStatus.COMPLETED, goal.getStatus());
        assertThrows(IllegalStateException.class, () -> goal.update(null, null, 20, null, null));
        assertThrows(IllegalStateException.class, goal::abandon);
        assertEquals(5, goal.getTargetValue());
    }

    @Test void abandonedGoalIsTerminalAndInvalidAmountsDoNotMutate() {
        var goal = new Goal(null, "Read", null, 10, null, null);
        assertThrows(IllegalArgumentException.class, () -> goal.addProgress(-1));
        assertThrows(IllegalArgumentException.class, () -> goal.addProgress(0));
        assertThrows(IllegalArgumentException.class, () -> goal.update(null, null, 0, null, null));
        goal.abandon();
        goal.abandon();
        assertThrows(IllegalStateException.class, () -> goal.addProgress(1));
        assertThrows(IllegalStateException.class, () -> goal.update(null, null, 20, null, null));
        assertEquals(0, goal.getCurrentValue());
        assertEquals(GoalStatus.ABANDONED, goal.getStatus());
    }
}
