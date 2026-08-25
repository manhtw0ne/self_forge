package com.selfforge.discipline.common;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller or handler method as requiring a Premium subscription.
 * The PremiumInterceptor checks this annotation and returns 403 for free-tier users.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePremium {
}
