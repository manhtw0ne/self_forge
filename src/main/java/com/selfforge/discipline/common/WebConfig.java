package com.selfforge.discipline.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the PremiumInterceptor for all /api/** endpoints.
 */
@Configuration
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
public class WebConfig implements WebMvcConfigurer {

    private final PremiumInterceptor premiumInterceptor;
    private final org.springframework.boot.autoconfigure.web.WebProperties webProperties;

    public WebConfig(PremiumInterceptor premiumInterceptor, org.springframework.boot.autoconfigure.web.WebProperties webProperties) {
        this.premiumInterceptor = premiumInterceptor;
        this.webProperties = webProperties;
    }

    @Override
    public void configureContentNegotiation(org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer configurer) {
        configurer.mediaType("webmanifest", org.springframework.http.MediaType.parseMediaType("application/manifest+json"));
    }

    @Override
    public void addResourceHandlers(org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/sw.js", "/manifest.webmanifest", "/offline.html", "/index.html")
                .addResourceLocations(webProperties.getResources().getStaticLocations())
                .setCacheControl(org.springframework.http.CacheControl.noCache());
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(premiumInterceptor)
                .addPathPatterns("/api/**");
    }
}
