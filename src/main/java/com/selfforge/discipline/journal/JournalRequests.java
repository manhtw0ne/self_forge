package com.selfforge.discipline.journal;

import java.time.LocalDate;

public final class JournalRequests {

    private JournalRequests() {
    }

    public record SaveJournalRequest(
            LocalDate date,
            @jakarta.validation.constraints.Size(max = 5000) String win,
            @jakarta.validation.constraints.Size(max = 5000) String obstacle,
            @jakarta.validation.constraints.Size(max = 5000) String lesson,
            @jakarta.validation.constraints.Size(max = 5000) String tomorrowFocus
    ) {
    }
}
