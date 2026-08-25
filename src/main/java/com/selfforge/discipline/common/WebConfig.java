package com.selfforge.discipline.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the PremiumInterceptor for all /api/** endpoints.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final PremiumInterceptor premiumInterceptor;

    public WebConfig(PremiumInterceptor premiumInterceptor) {
        this.premiumInterceptor = premiumInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(premiumInterceptor)
                .addPathPatterns("/api/**");
    }
}
