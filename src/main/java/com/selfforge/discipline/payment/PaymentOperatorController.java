package com.selfforge.discipline.payment;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Read-only reconciliation queue for authenticated provider events that could
 * not safely grant an entitlement. It deliberately has no manual-grant action.
 */
@RestController
@RequestMapping("/api/operator/payments")
@Transactional(readOnly = true)
public class PaymentOperatorController {
    private static final int DEFAULT_LIMIT = 20;
    private final PaymentOperatorAccess access;
    private final PaymentEventRepository events;

    public PaymentOperatorController(PaymentOperatorAccess access, PaymentEventRepository events) {
        this.access = access;
        this.events = events;
    }

    public record ReviewResponse(long id, String provider, String externalId, String reference,
                                 long amountVnd, PaymentReviewReason reviewReason,
                                 Long expectedAmountVnd, PaymentPlan plan, Instant receivedAt,
                                 PaymentOrderStatus orderStatus) {
        private static ReviewResponse from(PaymentEvent event) {
            PaymentOrder order = event.getOrder();
            return new ReviewResponse(event.getId(), event.getProvider(), event.getExternalId(),
                    event.getOrderReference(), event.getAmountVnd(), event.getReviewReason(),
                    order == null ? null : order.getAmountVnd(), order == null ? null : order.getPlan(), event.getReceivedAt(),
                    order == null ? null : order.getStatus());
        }
    }

    @GetMapping("/review")
    public List<ReviewResponse> listReview(
            @RequestHeader(name = "X-SelfForge-Payment-Operator-Key", required = false) String key,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(defaultValue = "20") int limit) {
        if (!access.granted(key)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (beforeId != null && beforeId < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        if (limit < 1 || limit > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return events.findReviewPage(beforeId, PageRequest.of(0, limit)).stream()
                .map(ReviewResponse::from).toList();
    }
}
