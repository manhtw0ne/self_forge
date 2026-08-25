package com.selfforge.discipline.common;

import com.selfforge.discipline.auth.AppUser;
import com.selfforge.discipline.auth.CurrentUserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Intercepts requests to @RequirePremium annotated controllers/methods.
 * Returns 403 Forbidden with a JSON error body for non-premium users.
 */
@Component
public class PremiumInterceptor implements HandlerInterceptor {

    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    public PremiumInterceptor(CurrentUserService currentUserService, ObjectMapper objectMapper) {
        this.currentUserService = currentUserService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        // Check annotation on method first, then on class
        boolean requirePremium = handlerMethod.hasMethodAnnotation(RequirePremium.class)
                || handlerMethod.getBeanType().isAnnotationPresent(RequirePremium.class);

        if (!requirePremium) {
            return true;
        }

        try {
            AppUser user = currentUserService.requireUser(request);
            if (user.isPremium()) {
                return true;
            }
        } catch (Exception e) {
            // Auth errors will be handled by the normal auth flow
            return true;
        }

        // User is not premium — block access
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType("application/json;charset=UTF-8");

        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.FORBIDDEN);
        detail.setTitle("Premium required");
        detail.setDetail("Tính năng này yêu cầu gói Premium. Nâng cấp để mở khóa!");

        response.getWriter().write(objectMapper.writeValueAsString(detail));
        return false;
    }
}
