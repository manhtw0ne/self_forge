package com.selfforge.discipline.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Feature flags keep checkout and external callbacks inert until the merchant setup is reviewed. */
@Component
public class PaymentSettings {
    private final boolean ordersEnabled;
    private final boolean sepayWebhookEnabled;
    private final String sepayWebhookKey;
    private final String sepayRecipientAccount;

    public PaymentSettings(@Value("${app.payment.orders-enabled:false}") boolean ordersEnabled,
                           @Value("${app.payment.sepay.webhook-enabled:false}") boolean sepayWebhookEnabled,
                           @Value("${app.payment.sepay.webhook-key:}") String sepayWebhookKey,
                           @Value("${app.payment.sepay.recipient-account:}") String sepayRecipientAccount) {
        if (sepayWebhookEnabled && (!ordersEnabled || sepayWebhookKey.isBlank() || sepayRecipientAccount.isBlank())) {
            throw new IllegalArgumentException("An enabled SePay webhook requires enabled orders, key and recipient account");
        }
        this.ordersEnabled = ordersEnabled;
        this.sepayWebhookEnabled = sepayWebhookEnabled;
        this.sepayWebhookKey = sepayWebhookKey;
        this.sepayRecipientAccount = sepayRecipientAccount;
    }

    public boolean ordersEnabled() { return ordersEnabled; }
    public boolean sepayWebhookEnabled() { return sepayWebhookEnabled; }
    String sepayWebhookKey() { return sepayWebhookKey; }
    String sepayRecipientAccount() { return sepayRecipientAccount; }
}
