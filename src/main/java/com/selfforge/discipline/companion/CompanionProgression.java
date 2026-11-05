package com.selfforge.discipline.companion;

/**
 * Versioned rules for the current companion progression. A future rebalance
 * must introduce a new version and an explicit migration path rather than
 * silently reinterpreting an existing user's earned progress.
 */
public final class CompanionProgression {
    public static final int VERSION = 1;
    public static final long STAGE_TWO_XP = 100L;
    public static final long STAGE_THREE_XP = 500L;

    private CompanionProgression() { }

    public static int stageFor(long xp) {
        return xp >= STAGE_THREE_XP ? 3 : xp >= STAGE_TWO_XP ? 2 : 1;
    }

    public static Long nextThreshold(int stage) {
        return switch (stage) {
            case 1 -> STAGE_TWO_XP;
            case 2 -> STAGE_THREE_XP;
            case 3 -> null;
            default -> throw new IllegalArgumentException("Invalid companion stage");
        };
    }
}
