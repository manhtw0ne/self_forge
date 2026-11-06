package com.selfforge.discipline.common;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Adds security headers to all HTTP responses.
 *
 * CSP is set to a restrictive policy:
 *  - default-src 'self'  — only same-origin resources by default
 *  - script-src 'self' 'unsafe-inline'  — Vite builds inline scripts
 *  - style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
 *  - font-src 'self' https://fonts.gstatic.com
 *  - img-src 'self' data:  — allow base64 images (e.g. QR codes)
 *  - connect-src 'self'  — API calls only to same origin
 *  - frame-ancestors 'none'  — disallow framing
 *  - object-src 'none'  — no plugins
 *  - upgrade-insecure-requests  — force HTTPS for sub-resources
 */
@Component
@Order(1)
public class SecurityHeadersFilter implements Filter {

    private static final String CSP =
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data:; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none'; " +
            "object-src 'none'; " +
            "upgrade-insecure-requests";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-Frame-Options", "DENY");
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResponse.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        httpResponse.setHeader("Content-Security-Policy", CSP);

        String path = ((jakarta.servlet.http.HttpServletRequest) request).getRequestURI();
        if (path.startsWith("/api/")) {
            httpResponse.setHeader("Cache-Control", "no-store");
        } else if (path.equals("/sw.js") || path.equals("/manifest.webmanifest") || path.equals("/offline.html")
                || path.equals("/index.html") || path.equals("/assets/app-version.json") || path.equals("/assets/release.json")
                || !path.substring(path.lastIndexOf('/') + 1).contains(".")) {
            httpResponse.setHeader("Cache-Control", "no-cache");
        }

        chain.doFilter(request, httpResponse);
    }
}
