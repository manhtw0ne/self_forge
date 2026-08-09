package com.selfforge.discipline.journal;

import java.time.LocalDate;

public final class JournalRequests {

    private JournalRequests() {
    }

    public record SaveJournalRequest(
            LocalDate date,
            String win,
            String obstacle,
            String lesson,
            String tomorrowFocus
    ) {
    }
}
