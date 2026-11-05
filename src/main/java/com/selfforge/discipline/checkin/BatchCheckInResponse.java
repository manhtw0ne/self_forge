package com.selfforge.discipline.checkin;

import java.util.List;

/** Result of a retry-safe group completion request. */
public record BatchCheckInResponse(List<CheckInResponse> entries, int createdCount) {
    public BatchCheckInResponse {
        entries = List.copyOf(entries);
    }
}
