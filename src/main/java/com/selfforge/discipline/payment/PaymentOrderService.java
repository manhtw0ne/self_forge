package com.selfforge.discipline.payment;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.AppUserRepository;
import com.selfforge.discipline.auth.PremiumTier;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owns the payment state machine. A provider adapter may only call
 * {@link #recordVerifiedTransaction(ProviderTransaction)} after authenticating
 * the webhook; no browser endpoint can call it.
 */
@Service
@Transactional
public class PaymentOrderService {
    private static final char[] REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private final PaymentOrderRepository orders;
    private final PaymentEventRepository events;
    private final AppUserRepository users;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    private final long orderExpirySeconds;

    public PaymentOrderService(PaymentOrderRepository orders, PaymentEventRepository events,
                               AppUserRepository users, Clock clock,
                               @Value("${app.payment.order-expiry-seconds:1800}") long orderExpirySeconds) {
        if (orderExpirySeconds < 60 || orderExpirySeconds > 86_400) {
            throw new IllegalArgumentException("Payment order expiry must be between one minute and one day");
        }
        this.orders = orders;
        this.events = events;
        this.users = users;
        this.clock = clock;
        this.orderExpirySeconds = orderExpirySeconds;
    }

    public PaymentOrder create(AppUser user, PaymentPlan plan) {
        AppUser locked = users.lockById(user.getId()).orElseThrow();
        Instant now = Instant.now(clock);
        var active = orders.findFirstByUser_IdAndStatusOrderByCreatedAtDesc(locked.getId(), PaymentOrderStatus.PENDING);
        if (active.isPresent() && active.get().isPendingAndValidAt(now)) {
            if (active.get().getPlan() == plan) return active.get();
            active.get().cancelForPlanChange();
        }
        return orders.saveAndFlush(new PaymentOrder(locked, plan, nextReference(), now, now.plusSeconds(orderExpirySeconds)));
    }

    @Transactional(readOnly = true)
    public PaymentOrder findOwned(String reference, AppUser user) {
        return orders.findByReferenceAndUser_Id(reference, user.getId())
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Payment order not found"));
    }

    /**
     * Records a transaction emitted by an authenticated provider. Mismatches
     * are retained as REVIEW and never grant an entitlement. The provider's
     * unique transaction ID makes repeated callbacks idempotent.
     */
    public ProcessingResult recordVerifiedTransaction(ProviderTransaction transaction) {
        validate(transaction);
        var existing = events.findByProviderAndExternalId(transaction.provider(), transaction.externalId());
        if (existing.isPresent()) return ProcessingResult.duplicate(existing.get());

        PaymentOrder order = transaction.reference() == null ? null
                : orders.lockByReference(transaction.reference()).orElse(null);
        if (order == null) {
            return ProcessingResult.review(events.save(new PaymentEvent(null, transaction.provider(), transaction.externalId(),
                    transaction.reference(), transaction.amountVnd(), PaymentEventDisposition.REVIEW,
                    PaymentReviewReason.UNMATCHED_REFERENCE, Instant.now(clock))));
        }

        // Serialise separate paid orders for one user so subscription time is never lost.
        AppUser user = users.lockById(order.getUser().getId()).orElseThrow();
        existing = events.findByProviderAndExternalId(transaction.provider(), transaction.externalId());
        if (existing.isPresent()) return ProcessingResult.duplicate(existing.get());

        Instant now = Instant.now(clock);
        PaymentReviewReason reviewReason = reviewReason(order, user, transaction, now);
        if (reviewReason != null) {
            order.markReview();
            return ProcessingResult.review(events.save(new PaymentEvent(order, transaction.provider(), transaction.externalId(),
                    transaction.reference(), transaction.amountVnd(), PaymentEventDisposition.REVIEW, reviewReason, now)));
        }

        Instant entitlementStartsAt = user.getPremiumTier() == PremiumTier.PREMIUM
                && user.getPremiumExpiresAt() != null && user.getPremiumExpiresAt().isAfter(now)
                ? user.getPremiumExpiresAt() : now;
        Instant entitlementExpiresAt = order.getPlan().entitlementEndsAt(entitlementStartsAt);
        if (order.getPlan().lifetime()) user.activatePremium(PremiumTier.LIFETIME, null);
        else user.activatePremium(PremiumTier.PREMIUM, entitlementExpiresAt);
        order.markPaid(now, entitlementExpiresAt);
        return ProcessingResult.accepted(events.save(new PaymentEvent(order, transaction.provider(), transaction.externalId(),
                transaction.reference(), transaction.amountVnd(), PaymentEventDisposition.ACCEPTED, null, now)), order);
    }

    private static PaymentReviewReason reviewReason(PaymentOrder order, AppUser user,
                                                     ProviderTransaction transaction, Instant now) {
        if (!transaction.eligible()) return PaymentReviewReason.INELIGIBLE_TRANSFER;
        if (!order.isPendingAndValidAt(now) || !"VND".equals(order.getCurrency())) {
            return PaymentReviewReason.ORDER_NOT_PAYABLE;
        }
        if (order.getAmountVnd() != transaction.amountVnd()) return PaymentReviewReason.AMOUNT_MISMATCH;
        if (user.getPremiumTier() == PremiumTier.LIFETIME) return PaymentReviewReason.LIFETIME_ALREADY_ACTIVE;
        return null;
    }

    private String nextReference() {
        for (int attempt = 0; attempt < 10; attempt++) {
            var value = new StringBuilder("SFG");
            for (int index = 0; index < 16; index++) value.append(REFERENCE_ALPHABET[random.nextInt(REFERENCE_ALPHABET.length)]);
            String reference = value.toString();
            if (!orders.existsByReference(reference)) return reference;
        }
        throw new IllegalStateException("Could not allocate a unique payment reference");
    }

    private static void validate(ProviderTransaction transaction) {
        if (transaction == null || blank(transaction.provider()) || transaction.provider().length() > 32
                || blank(transaction.externalId()) || transaction.externalId().length() > 128
                || transaction.reference() != null && transaction.reference().length() > 32
                || transaction.amountVnd() <= 0) throw new IllegalArgumentException("Invalid verified payment transaction");
    }

    private static boolean blank(String value) { return value == null || value.isBlank(); }

    public record ProviderTransaction(String provider, String externalId, String reference, long amountVnd,
                                      boolean eligible) { }

    public record ProcessingResult(PaymentEventDisposition disposition, boolean duplicate,
                                   PaymentOrder order, PaymentEvent event) {
        static ProcessingResult accepted(PaymentEvent event, PaymentOrder order) {
            return new ProcessingResult(PaymentEventDisposition.ACCEPTED, false, order, event);
        }
        static ProcessingResult review(PaymentEvent event) {
            return new ProcessingResult(PaymentEventDisposition.REVIEW, false, event.getOrder(), event);
        }
        static ProcessingResult duplicate(PaymentEvent event) {
            return new ProcessingResult(event.getDisposition(), true, event.getOrder(), event);
        }
    }
}
