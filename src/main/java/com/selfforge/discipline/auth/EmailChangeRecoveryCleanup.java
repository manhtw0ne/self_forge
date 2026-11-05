package com.selfforge.discipline.auth;

import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Keeps short-lived recovery email addresses and token fingerprints from becoming permanent history. */
@Component
public class EmailChangeRecoveryCleanup {
    private final EmailChangeRecoveryRepository recoveries;

    public EmailChangeRecoveryCleanup(EmailChangeRecoveryRepository recoveries) { this.recoveries = recoveries; }

    @Scheduled(fixedDelayString = "${app.email-change-recovery.cleanup-delay-ms:3600000}", initialDelay = 60000)
    @Transactional
    public void purgeExpired() { recoveries.deleteByExpiresAtBefore(Instant.now()); }
}
