package com.selfforge.discipline.auth;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.mail.MailSendException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class ResendMailTransport {
    private final RestClient client;
    private final String apiKey;

    @org.springframework.beans.factory.annotation.Autowired
    public ResendMailTransport(@Value("${app.email.resend-api-key:}") String apiKey) {
        this.apiKey = apiKey;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.client = RestClient.builder().baseUrl("https://api.resend.com").requestFactory(factory).build();
    }

    ResendMailTransport(RestClient client, String apiKey) {
        this.client = client;
        this.apiKey = apiKey;
    }

    public boolean available() { return !apiKey.isBlank(); }

    public void send(String from, String to, String subject, String text) {
        if (!available()) throw new MailSendException("Email provider is not configured.");
        try {
            client.post().uri("/emails").headers(headers -> headers.setBearerAuth(apiKey))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("from", from, "to", List.of(to), "subject", subject, "text", text))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException failure) {
            // Do not retain provider response bodies, recipients, OTPs, or credentials in errors.
            throw new MailSendException("Email provider request failed.");
        }
    }
}
