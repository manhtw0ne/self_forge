package com.selfforge.discipline.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.regex.Pattern;

/**
 * Reads the deterministic release marker assembled with the production image.
 * The marker is an integrity/debugging identifier only; it contains no commit
 * name, environment setting, credential or account data. Development builds
 * deliberately degrade to {@value #UNKNOWN} when no packaged marker exists.
 */
@Component
public final class ReleaseInfo {
    static final String UNKNOWN = "unknown";
    private static final Pattern SHA_256 = Pattern.compile("[a-f0-9]{64}");

    private final String release;

    public ReleaseInfo(ObjectMapper json) {
        this.release = load(json);
    }

    public String release() {
        return release;
    }

    private static String load(ObjectMapper json) {
        try (InputStream source = new ClassPathResource("static/assets/release.json").getInputStream()) {
            return validOrUnknown(json.readTree(source).path("release").asText());
        } catch (Exception ignored) {
            // A health check must stay available in local/dev builds and when a
            // manually assembled artifact does not contain the optional marker.
            return UNKNOWN;
        }
    }

    static String validOrUnknown(String value) {
        return value != null && SHA_256.matcher(value).matches() ? value : UNKNOWN;
    }
}
