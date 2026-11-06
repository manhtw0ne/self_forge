package com.selfforge.discipline.payment;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Keeps the payment reconciliation queue invisible until a dedicated operator key is configured. */
@Component
public class PaymentOperatorAccess {
    private final byte[] configuredKey;

    public PaymentOperatorAccess(@Value("${app.payment.operator-key:}") String key) {
        this.configuredKey = key == null ? new byte[0] : key.getBytes(StandardCharsets.UTF_8);
    }

    public boolean granted(String suppliedKey) {
        if (configuredKey.length == 0 || suppliedKey == null) return false;
        return MessageDigest.isEqual(configuredKey, suppliedKey.getBytes(StandardCharsets.UTF_8));
    }
}
