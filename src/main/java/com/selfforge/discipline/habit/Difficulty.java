package com.selfforge.discipline.habit;

public enum Difficulty {
    EASY(5),
    MEDIUM(10),
    HARD(20);

    private final int defaultPoints;

    Difficulty(int defaultPoints) {
        this.defaultPoints = defaultPoints;
    }

    public int defaultPoints() {
        return defaultPoints;
    }
}
