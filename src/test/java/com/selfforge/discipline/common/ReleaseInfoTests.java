package com.selfforge.discipline.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReleaseInfoTests {
    @Test
    void acceptsOnlyOpaqueLowercaseSha256ReleaseIds() {
        String release = "a".repeat(64);
        assertEquals(release, ReleaseInfo.validOrUnknown(release));
        assertEquals(ReleaseInfo.UNKNOWN, ReleaseInfo.validOrUnknown("not-a-release"));
        assertEquals(ReleaseInfo.UNKNOWN, ReleaseInfo.validOrUnknown("A".repeat(64)));
        assertEquals(ReleaseInfo.UNKNOWN, ReleaseInfo.validOrUnknown(null));
    }
}
