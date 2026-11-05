package com.selfforge.discipline.journal;

import java.time.LocalDate;

public final class JournalRequests {

    private JournalRequests() {
    }

    public record JournalSnapshot(Long id,
            @jakarta.validation.constraints.Size(max = 5000) String win,
            @jakarta.validation.constraints.Size(max = 5000) String obstacle,
            @jakarta.validation.constraints.Size(max = 5000) String lesson,
            @jakarta.validation.constraints.Size(max = 5000) String tomorrowFocus) {}

    public record DeleteJournalRequest(@jakarta.validation.constraints.NotNull LocalDate date,@jakarta.validation.Valid @jakarta.validation.constraints.NotNull JournalSnapshot expected) {}

    public record SaveJournalRequest(
            LocalDate date,
            @jakarta.validation.constraints.Size(max = 5000) String win,
            @jakarta.validation.constraints.Size(max = 5000) String obstacle,
            @jakarta.validation.constraints.Size(max = 5000) String lesson,
            @jakarta.validation.constraints.Size(max = 5000) String tomorrowFocus,
            @jakarta.validation.Valid JournalSnapshot expected
    ) {
    }
}
