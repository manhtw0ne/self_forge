package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final AuthService authService;

    public CurrentUserService(AuthService authService) {
        this.authService = authService;
    }

    public AppUser requireUser(HttpServletRequest request) {
        String token = bearerToken(request);
        if (token == null) {
            token = request.getHeader("X-Auth-Token");
        }
        return authService.authenticate(token);
    }

    private String bearerToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring("Bearer ".length()).trim();
    }
}
