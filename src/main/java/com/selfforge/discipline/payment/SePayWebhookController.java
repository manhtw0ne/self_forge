package com.selfforge.discipline.payment;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * SePay API-key webhook receiver. It is unreachable until both payment flags
 * and the merchant key/account configuration are deliberately enabled.
 */
@RestController
@RequestMapping("/api/payments/sepay")
public class SePayWebhookController {
    private static final Pattern REFERENCE = Pattern.compile("(?<![A-Z0-9])(SFG[A-Z2-9]{16})(?![A-Z0-9])");
    private final PaymentSettings settings;
    private final PaymentOrderService orders;

    public SePayWebhookController(PaymentSettings settings, PaymentOrderService orders) {
        this.settings = settings;
        this.orders = orders;
    }

    public record WebhookRequest(@NotNull @Min(1) Long id, @NotBlank String accountNumber,
                                 @NotBlank String transferType, String content,
                                 @NotNull @Min(1) Long transferAmount) { }

    @PostMapping("/webhook")
    public Map<String, Boolean> receive(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody WebhookRequest request) {
        if (!settings.sepayWebhookEnabled()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (!matchesApiKey(authorization, settings.sepayWebhookKey())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        boolean eligible = "in".equalsIgnoreCase(request.transferType().trim())
                && digits(settings.sepayRecipientAccount()).equals(digits(request.accountNumber()));
        orders.recordVerifiedTransaction(new PaymentOrderService.ProviderTransaction(
                "SEPAY", request.id().toString(), extractReference(request.content()), request.transferAmount(), eligible));
        // A verified but mismatched transfer is retained for review, not retried indefinitely by the provider.
        return Map.of("success", true);
    }

    private static boolean matchesApiKey(String authorization, String configuredKey) {
        if (authorization == null || !authorization.startsWith("Apikey ")) return false;
        return MessageDigest.isEqual(authorization.substring("Apikey ".length()).getBytes(StandardCharsets.UTF_8),
                configuredKey.getBytes(StandardCharsets.UTF_8));
    }

    private static String extractReference(String content) {
        if (content == null) return null;
        Matcher match = REFERENCE.matcher(content.toUpperCase(java.util.Locale.ROOT));
        return match.find() ? match.group(1) : null;
    }

    private static String digits(String value) { return value == null ? "" : value.replaceAll("[^0-9]", ""); }
}
