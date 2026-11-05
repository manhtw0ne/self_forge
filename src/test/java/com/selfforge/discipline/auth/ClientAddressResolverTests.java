package com.selfforge.discipline.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClientAddressResolverTests {
    @Test void ignoresForwardedHeaderUnlessTheDeploymentTrustsItsProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.9");
        request.addHeader("X-Forwarded-For", "203.0.113.7, 10.0.0.1");

        assertEquals("198.51.100.9", new ClientAddressResolver(false).resolve(request));
        assertEquals("203.0.113.7", new ClientAddressResolver(true).resolve(request));
    }

    @Test void doesNotResolveHostnameOrMalformedForwardedValues() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("::1");
        request.addHeader("X-Forwarded-For", "example.com");

        assertEquals("0:0:0:0:0:0:0:1", new ClientAddressResolver(true).resolve(request));
    }
}
