package com.selfforge.discipline;

import com.selfforge.discipline.auth.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:reset;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop"})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class PasswordResetTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AuthService auth;
    @Autowired PasswordResetCodeRepository codes;
    @Autowired AppUserRepository users;
    @MockitoBean PasswordResetMail mail;
    @MockitoBean Clock clock;
    private final Map<String, String> inbox = new HashMap<>();
    private final Instant now = Instant.parse("2026-09-26T01:00:00Z");

    @BeforeEach void setup() {
        when(clock.instant()).thenReturn(now);
        when(mail.available()).thenReturn(true);
        doAnswer(call -> { inbox.put(call.getArgument(0), call.getArgument(1)); return null; })
                .when(mail).send(anyString(), anyString());
    }
    private String email() { return UUID.randomUUID() + "@example.com"; }
    private String register(String email) {
        return auth.register(new AuthRequests.RegisterRequest(email, "Reset tester", "password123")).token();
    }
    private String request(String email) throws Exception {
        return mvc.perform(post("/api/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
    }
    private org.springframework.test.web.servlet.ResultActions confirm(String email, String code) throws Exception {
        return mvc.perform(post("/api/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "code", code,
                        "newPassword", "changed123", "confirmPassword", "changed123"))));
    }

    @Test void responseDoesNotExposeExistenceAndCodeIsHashed() throws Exception {
        String email = email(); register(email);
        assertEquals(request(email), request(email()));
        assertTrue(inbox.get(email).matches("[0-9]{6}"));
        var user = users.findByEmail(email).orElseThrow();
        assertNotEquals(inbox.get(email), codes.findById(user.getId()).orElseThrow().getCodeHash());
        request(email);
        verify(mail, times(1)).send(eq(email), anyString());
    }

    @Test void wrongAttemptsPersistAndLockEvenCorrectCode() throws Exception {
        String email = email(); register(email); request(email);
        String actual = inbox.get(email);
        String wrong = actual.equals("000000") ? "000001" : "000000";
        for (int i = 0; i < 5; i++) confirm(email, wrong).andExpect(status().isBadRequest());
        confirm(email, actual).andExpect(status().isBadRequest());
        assertNotNull(auth.login(new AuthRequests.LoginRequest(email, "password123")));
    }

    @Test void expiryAndResendLimitUseServerClock() throws Exception {
        String email = email(); register(email); request(email);
        String first = inbox.get(email);
        when(clock.instant()).thenReturn(now.plusSeconds(600));
        confirm(email, first).andExpect(status().isBadRequest());
        request(email);
        when(clock.instant()).thenReturn(now.plusSeconds(660));
        request(email);
        when(clock.instant()).thenReturn(now.plusSeconds(720));
        request(email);
        verify(mail, times(3)).send(eq(email), anyString());
        when(clock.instant()).thenReturn(now.plusSeconds(3600));
        request(email);
        verify(mail, times(4)).send(eq(email), anyString());
    }

    @Test void successfulResetRevokesAllSessionsAndCodeCannotBeReused() throws Exception {
        String email = email();
        String first = register(email);
        String second = auth.login(new AuthRequests.LoginRequest(email, "password123")).token();
        request(email);
        String otp = inbox.get(email);
        confirm(email, otp).andExpect(status().isNoContent());
        for (String token : List.of(first, second)) mvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        confirm(email, otp).andExpect(status().isBadRequest());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> auth.login(new AuthRequests.LoginRequest(email, "password123")));
        assertNotNull(auth.login(new AuthRequests.LoginRequest(email, "changed123")));
    }

    @Test void mismatchDoesNotConsumeCodeAndProfilePasswordChangeInvalidatesIt() throws Exception {
        String email = email(); String token = register(email); request(email);
        String otp = inbox.get(email);
        mvc.perform(post("/api/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "code", otp,
                        "newPassword", "changed123", "confirmPassword", "different123"))))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/profile/password").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "oldPassword", "password123", "newPassword", "changed123", "confirmPassword", "changed123"))))
                .andExpect(status().isOk());
        confirm(email, otp).andExpect(status().isBadRequest());
    }

    @Test void mailFailureInvalidatesCodeAndDisabledServiceIsUnavailable() throws Exception {
        String email = email(); register(email);
        doAnswer(call -> { inbox.put(call.getArgument(0), call.getArgument(1)); throw new MailSendException("Simulated failure"); })
                .when(mail).send(anyString(), anyString());
        request(email);
        confirm(email, inbox.get(email)).andExpect(status().isBadRequest());
        when(mail.available()).thenReturn(false);
        mvc.perform(get("/api/auth/password-reset/availability")).andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(post("/api/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email)))).andExpect(status().isServiceUnavailable());
    }

    @Test void concurrentConfirmOnlySucceedsOnce() throws Exception {
        String email = email(); register(email); request(email);
        String otp = inbox.get(email);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var results = new ArrayList<java.util.concurrent.Future<Integer>>();
            for (int i = 0; i < 2; i++) results.add(executor.submit(() -> {
                start.await();
                return confirm(email, otp).andReturn().getResponse().getStatus();
            }));
            start.countDown();
            var statuses = new ArrayList<Integer>();
            for (var future : results) statuses.add(future.get(30, java.util.concurrent.TimeUnit.SECONDS));
            Collections.sort(statuses);
            assertEquals(List.of(204, 400), statuses);
        }
    }

    @Test void resendReplacesPreviousCode() throws Exception {
        String email = email(); register(email); request(email);
        String old = inbox.get(email);
        when(clock.instant()).thenReturn(now.plusSeconds(60));
        request(email);
        String latest = inbox.get(email);
        // A random six-digit code may legitimately repeat; both emails then carry the same code.
        if (!old.equals(latest)) confirm(email, old).andExpect(status().isBadRequest());
        confirm(email, latest).andExpect(status().isNoContent());
    }
}
