package com.selfforge.discipline.payment;

import java.time.Instant;
import java.time.ZoneOffset;

/** Server-owned catalog. The browser never supplies an amount or entitlement duration. */
public enum PaymentPlan {
    MONTHLY(49_000L, 1),
    YEARLY(399_000L, 12),
    LIFETIME(999_000L, 0);

    private final long amountVnd;
    private final int months;

    PaymentPlan(long amountVnd, int months) {
        this.amountVnd = amountVnd;
        this.months = months;
    }

    public long amountVnd() { return amountVnd; }

    public boolean lifetime() { return months == 0; }

    public Instant entitlementEndsAt(Instant startsAt) {
        if (lifetime()) return null;
        return startsAt.atZone(ZoneOffset.UTC).plusMonths(months).toInstant();
    }
}
