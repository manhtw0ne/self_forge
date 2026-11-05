package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resolves the network address used only as an anti-abuse input.
 *
 * Forwarded headers are accepted only when the deployment explicitly says
 * that a trusted reverse proxy has removed client-supplied copies. The caller
 * must still hash the returned value before persisting it.
 */
@Component
public class ClientAddressResolver {
    private final boolean trustForwardedHeader;

    public ClientAddressResolver(
            @Value("${app.client-address.trust-forwarded-header:false}") boolean trustForwardedHeader) {
        this.trustForwardedHeader = trustForwardedHeader;
    }

    public String resolve(HttpServletRequest request) {
        if (trustForwardedHeader) {
            String candidate = firstForwardedAddress(request.getHeader("X-Forwarded-For"));
            if (candidate != null) return candidate;
        }
        String remoteAddress = request.getRemoteAddr();
        return validAddress(remoteAddress) ? canonical(remoteAddress) : "unknown";
    }

    private static String firstForwardedAddress(String header) {
        if (header == null || header.isBlank()) return null;
        String first = header.split(",", 2)[0].trim();
        return validAddress(first) ? canonical(first) : null;
    }

    private static boolean validAddress(String value) {
        if (value == null || value.isBlank() || value.length() > 45) return false;
        // Do not pass a hostname to InetAddress: resolving a header value must
        // never perform a DNS lookup. IPv4 has dots, IPv6 has colons.
        if (!(value.contains(".") || value.contains(":")) || !value.matches("[0-9A-Fa-f:.]+")) return false;
        try {
            InetAddress parsed = InetAddress.getByName(value);
            return parsed.getHostAddress() != null;
        } catch (UnknownHostException invalid) {
            return false;
        }
    }

    private static String canonical(String value) {
        try {
            return InetAddress.getByName(value).getHostAddress();
        } catch (UnknownHostException impossibleAfterValidation) {
            return value;
        }
    }
}
