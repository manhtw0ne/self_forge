package com.selfforge.discipline.beta;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Keeps aggregate beta reporting disabled until an operator key is configured. */
@Component
public class BetaMetricsAccess {
    private final byte[] configuredKey;

    public BetaMetricsAccess(@Value("${app.beta-metrics.key:}") String key) {
        this.configuredKey = key == null ? new byte[0] : key.getBytes(StandardCharsets.UTF_8);
    }

    public boolean granted(String suppliedKey) {
        if (configuredKey.length == 0 || suppliedKey == null) {
            return false;
        }
        return MessageDigest.isEqual(configuredKey, suppliedKey.getBytes(StandardCharsets.UTF_8));
    }
}
