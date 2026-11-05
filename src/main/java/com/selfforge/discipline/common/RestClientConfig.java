package com.selfforge.discipline.common;

import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.web.client.RestClientAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Provides a RestClient.Builder bean using the static factory method so the
 * application context never tries to establish a loopback connection during
 * startup (which Spring Boot 3.5.x RestClientAutoConfiguration does via
 * JdkClientHttpRequestFactoryBuilder). Excludes the auto-configuration to
 * prevent duplicate bean registration.
 *
 * <p>All coach/OAuth services that need an HTTP client receive this builder and
 * apply their own request factory (timeouts, base URL) in their constructor.
 * This keeps the same usage pattern while removing the network dependency at
 * startup time.
 */
@Configuration
@EnableAutoConfiguration(exclude = RestClientAutoConfiguration.class)
public class RestClientConfig {

    @Bean
    public RestClient.Builder restClientBuilder() {
        // Uses the static factory — no network call, no loopback needed.
        return RestClient.builder();
    }
}

