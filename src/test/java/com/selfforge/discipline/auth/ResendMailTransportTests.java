package com.selfforge.discipline.auth;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.mail.MailSendException;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ResendMailTransportTests {
    @Test void resendModeWorksWithoutSmtpAndKeepsBilingualOtpContent() {
        @SuppressWarnings("unchecked")
        var smtp = (org.springframework.beans.factory.ObjectProvider<org.springframework.mail.javamail.JavaMailSender>)
                org.mockito.Mockito.mock(org.springframework.beans.factory.ObjectProvider.class);
        var transport = org.mockito.Mockito.mock(ResendMailTransport.class);
        org.mockito.Mockito.when(transport.available()).thenReturn(true);
        var mail = new PasswordResetMail(smtp, true, "noreply@example.com", "resend", transport);
        assertTrue(mail.available());
        mail.sendRegistration("user@example.com", "012345");
        mail.send("user@example.com", "654321");
        var content = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(transport, org.mockito.Mockito.times(2)).send(
                org.mockito.ArgumentMatchers.eq("noreply@example.com"), org.mockito.ArgumentMatchers.eq("user@example.com"),
                org.mockito.ArgumentMatchers.anyString(), content.capture());
        assertTrue(content.getAllValues().get(0).contains("Your registration verification code: 012345"));
        assertTrue(content.getAllValues().get(1).contains("Your password reset code: 654321"));
        for (var text : content.getAllValues()) {
            assertTrue(text.contains("10 phút")); assertTrue(text.contains("10 minutes"));
        }
        org.mockito.Mockito.verifyNoInteractions(smtp);
        assertFalse(new PasswordResetMail(smtp, false, "a@example.com", "resend", transport).available());
        assertFalse(new PasswordResetMail(smtp, true, "", "resend", transport).available());
        assertTrue(new PasswordResetMail(smtp, true, "a@example.com", "ReSeNd", transport).available());
        assertThrows(IllegalArgumentException.class,
                () -> new PasswordResetMail(smtp, true, "a@example.com", "unknown", transport));
    }

    @Test void sendsOtpOverHttpsWithServerSideAuthentication() {
        var builder = RestClient.builder().baseUrl("https://api.resend.com");
        var server = MockRestServiceServer.bindTo(builder).build();
        var transport = new ResendMailTransport(builder.build(), "test-key");
        server.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST)).andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(content().json("{\"from\":\"noreply@example.com\",\"to\":[\"user@example.com\"],\"subject\":\"Verify email\",\"text\":\"Code: 012345\"}"))
                .andRespond(withSuccess("{\"id\":\"accepted\"}", MediaType.APPLICATION_JSON));
        transport.send("noreply@example.com", "user@example.com", "Verify email", "Code: 012345");
        server.verify();
    }
    @Test void failureIsSanitizedAndDoesNotRetryOrLeakProviderResponse() {
        var builder = RestClient.builder().baseUrl("https://api.resend.com");
        var server = MockRestServiceServer.bindTo(builder).build();
        var transport = new ResendMailTransport(builder.build(), "test-key");
        server.expect(requestTo("https://api.resend.com/emails"))
                .andRespond(withServerError().body("private@example.com OTP 012345"));
        var error = assertThrows(MailSendException.class,
                () -> transport.send("noreply@example.com", "user@example.com", "Verify", "012345"));
        assertEquals("Email provider request failed.", error.getMessage());
        assertNull(error.getCause());
        server.verify();
    }
    @Test void missingKeyCannotSend() {
        var transport = new ResendMailTransport(RestClient.create(), " ");
        assertFalse(transport.available());
        assertThrows(MailSendException.class, () -> transport.send("a", "b", "c", "d"));
    }
}
