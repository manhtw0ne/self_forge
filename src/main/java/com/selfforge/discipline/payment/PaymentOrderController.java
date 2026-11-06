package com.selfforge.discipline.payment;

import com.selfforge.discipline.auth.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Authenticated order API. It exposes no payment provider secrets or client-controlled prices. */
@RestController
@RequestMapping("/api/payments/orders")
public class PaymentOrderController {
    private final CurrentUserService current;
    private final PaymentSettings settings;
    private final PaymentOrderService orders;

    public PaymentOrderController(CurrentUserService current, PaymentSettings settings, PaymentOrderService orders) {
        this.current = current;
        this.settings = settings;
        this.orders = orders;
    }

    public record CreateRequest(@NotNull PaymentPlan plan) { }
    public record Response(String reference, PaymentPlan plan, PaymentOrderStatus status, long amountVnd,
                           String currency, Instant createdAt, Instant expiresAt, Instant paidAt,
                           Instant entitlementExpiresAt) {
        static Response from(PaymentOrder order) {
            return new Response(order.getReference(), order.getPlan(), order.getStatus(), order.getAmountVnd(),
                    order.getCurrency(), order.getCreatedAt(), order.getExpiresAt(), order.getPaidAt(),
                    order.getEntitlementExpiresAt());
        }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response create(@Valid @RequestBody CreateRequest request, HttpServletRequest servletRequest) {
        var user = current.requireUser(servletRequest);
        if (!settings.ordersEnabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Premium payment is not available yet");
        return Response.from(orders.create(user, request.plan()));
    }

    @GetMapping("/{reference}")
    public Response get(@PathVariable String reference, HttpServletRequest servletRequest) {
        return Response.from(orders.findOwned(reference, current.requireUser(servletRequest)));
    }
}
