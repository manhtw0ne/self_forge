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

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:registration;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.flyway.enabled=true", "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.jpa.hibernate.ddl-auto=validate", "app.registration.require-email-verification=true"})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class RegistrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired RegistrationCodeRepository codes;
    @MockitoBean PasswordResetMail mail;
    @MockitoBean Clock clock;
    private final Map<String, String> inbox = new java.util.concurrent.ConcurrentHashMap<>();
    private final Instant now = Instant.parse("2026-09-26T01:00:00Z");
    @BeforeEach void setup() {
        when(clock.instant()).thenReturn(now);
        when(mail.available()).thenReturn(true);
        doAnswer(call -> { inbox.put(call.getArgument(0), call.getArgument(1)); return null; })
                .when(mail).sendRegistration(anyString(), anyString());
    }
    private String email() { return UUID.randomUUID() + "@example.com"; }
    private String request(String email) throws Exception {
        return mvc.perform(post("/api/auth/registration/request").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email)))).andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
    }
    private org.springframework.test.web.servlet.ResultActions register(String email, String code) throws Exception {
        var body = new HashMap<String, String>();
        body.put("email", email); body.put("displayName", "Tester"); body.put("password", "password123");
        if (code != null) body.put("code", code);
        return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)));
    }
    @Test void accountAndSessionOnlyExistAfterVerification() throws Exception {
        String email = email();
        register(email, null).andExpect(status().isBadRequest());
        request(email.toUpperCase(Locale.ROOT));
        assertFalse(users.existsByEmail(email));
        assertNotEquals(inbox.get(email), codes.findById(email).orElseThrow().getCodeHash());
        var body = register(email, inbox.get(email)).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        assertNotNull(users.findByEmail(email).orElseThrow().getEmailVerifiedAt());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + json.readTree(body).get("token").asText()))
                .andExpect(status().isOk());
        register(email, inbox.get(email)).andExpect(status().isBadRequest());
    }
    @Test void failedAttemptsCommitAcrossOuterRegistrationTransaction() throws Exception {
        String email = email(); request(email);
        String actual = inbox.get(email);
        String wrong = actual.equals("000000") ? "000001" : "000000";
        for (int i = 0; i < 5; i++) register(email, wrong).andExpect(status().isBadRequest());
        register(email, actual).andExpect(status().isBadRequest());
        assertFalse(users.existsByEmail(email));
    }
    @Test void expirationResendAndHourlyLimit() throws Exception {
        String email = email(); request(email);
        String old = inbox.get(email);
        request(email);
        verify(mail, times(1)).sendRegistration(eq(email), anyString());
        when(clock.instant()).thenReturn(now.plusSeconds(600));
        register(email, old).andExpect(status().isBadRequest());
        request(email);
        when(clock.instant()).thenReturn(now.plusSeconds(660));
        request(email);
        when(clock.instant()).thenReturn(now.plusSeconds(720));
        request(email);
        verify(mail, times(3)).sendRegistration(eq(email), anyString());
        register(email, inbox.get(email)).andExpect(status().isCreated());
    }
    @Test void existingEmailGetsGenericResponseWithoutAnotherEmail() throws Exception {
        String existing = email(); request(existing); register(existing, inbox.get(existing)).andExpect(status().isCreated());
        assertEquals(request(existing), request(email()));
        verify(mail, times(1)).sendRegistration(eq(existing), anyString());
    }
    @Test void enabledPolicyCannotFallBackWhenMailUnavailable() throws Exception {
        when(mail.available()).thenReturn(false);
        mvc.perform(get("/api/auth/registration/availability"))
                .andExpect(jsonPath("$.required").value(true)).andExpect(jsonPath("$.enabled").value(false));
        register(email(), null).andExpect(status().isServiceUnavailable());
    }
    @Test void deliveryFailureDoesNotLeaveUsableCode() throws Exception {
        String email = email();
        doAnswer(call -> { inbox.put(call.getArgument(0), call.getArgument(1)); throw new MailSendException("Simulated"); })
                .when(mail).sendRegistration(anyString(), anyString());
        request(email);
        register(email, inbox.get(email)).andExpect(status().isBadRequest());
        assertFalse(users.existsByEmail(email));
    }
    @Test void concurrentInitialRequestsSendOnlyOneCode() throws Exception {
        String email = email();
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var start = new java.util.concurrent.CountDownLatch(1);
            var futures = new ArrayList<java.util.concurrent.Future<String>>();
            for (int i = 0; i < 2; i++) futures.add(executor.submit(() -> { start.await(); return request(email); }));
            start.countDown();
            for (var future : futures) future.get(30, java.util.concurrent.TimeUnit.SECONDS);
        }
        verify(mail, times(1)).sendRegistration(eq(email), anyString());
        register(email, inbox.get(email)).andExpect(status().isCreated());
    }
}