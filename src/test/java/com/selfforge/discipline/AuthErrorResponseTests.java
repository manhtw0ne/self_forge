package com.selfforge.discipline;

import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.common.ApiExceptionHandler;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthErrorResponseTests {
    @Test
    void invalidCredentialsHaveUsableDetailWithoutExposingInternalException() throws Exception {
        var service = mock(AuthService.class);
        when(service.login(any())).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Invalid email or password", new IllegalStateException("INTERNAL_SECRET")));
        var mvc = MockMvcBuilders.standaloneSetup(new AuthController(service,
                mock(CurrentUserService.class), new LoginAttemptLimiter(Clock.systemUTC())))
                .setControllerAdvice(new ApiExceptionHandler()).build();
        mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"email\":\"user@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.detail").value("Invalid email or password"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("INTERNAL_SECRET"))))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }
}
