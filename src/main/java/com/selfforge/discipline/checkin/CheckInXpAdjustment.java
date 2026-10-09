package com.selfforge.discipline.checkin;

import jakarta.persistence.*;
import java.time.Instant;

/** Audit of base check-in XP only; one-time achievement awards are separate. */
@Entity
public class CheckInXpAdjustment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private DailyCheckIn checkIn;
    @Enumerated(EnumType.STRING)
    private CheckInStatus fromStatus;
    @Enumerated(EnumType.STRING)
    private CheckInStatus toStatus;
    private int delta;
    private Instant createdAt;

    protected CheckInXpAdjustment() {}

    public CheckInXpAdjustment(DailyCheckIn checkIn, CheckInStatus from, CheckInStatus to, int delta) {
        this.checkIn = checkIn;
        this.fromStatus = from;
        this.toStatus = to;
        this.delta = delta;
        this.createdAt = Instant.now();
    }
}
