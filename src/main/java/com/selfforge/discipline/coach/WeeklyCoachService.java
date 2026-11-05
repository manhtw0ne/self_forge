package com.selfforge.discipline.coach;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfforge.discipline.insight.WeeklyInsightService;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Optional OpenAI-compatible weekly coach. It only receives the aggregate weekly
 * snapshot constructed from recorded check-ins and completed focus sessions.
 */
@Service
public class WeeklyCoachService {
    public record Observation(long habitId, String text) {}
    public record Advice(String headline, List<Observation> observations, List<String> experiments) {}

    private final RestClient client;
    private final ObjectMapper json;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final String endpoint;

    public WeeklyCoachService(RestClient.Builder builder, ObjectMapper json,
            @Value("${app.ai.weekly.enabled:false}") boolean enabled,
            @Value("${app.ai.weekly.api-key:}") String apiKey,
            @Value("${app.ai.weekly.model:gpt-4o-mini}") String model,
            @Value("${app.ai.weekly.endpoint:https://api.openai.com/v1/chat/completions}") String endpoint) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(25));
        this.client = builder.requestFactory(factory).build();
        this.json = json;
        this.enabled = enabled;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null ? "" : model.trim();
        this.endpoint = endpoint == null ? "" : endpoint.trim();
    }

    public boolean available() {
        return enabled && !apiKey.isBlank() && !model.isBlank() && endpoint.startsWith("https://");
    }

    public Advice generate(WeeklyInsightService.Snapshot snapshot, String language) {
        if (!available()) throw new IllegalStateException("AI coach is not configured.");
        try {
            Map<String, Object> input = providerInput(snapshot);
            String prompt = prompt(language, json.writeValueAsString(input));
            Map<String, Object> request = Map.of(
                    "model", model,
                    "temperature", 0.2,
                    "response_format", Map.of("type", "json_object"),
                    "messages", List.of(
                            Map.of("role", "system", "content", systemInstruction(language)),
                            Map.of("role", "user", "content", prompt)));
            JsonNode response = client.post().uri(endpoint).headers(headers -> headers.setBearerAuth(apiKey))
                    .contentType(MediaType.APPLICATION_JSON).body(request).retrieve().body(JsonNode.class);
            return parse(response, snapshot);
        } catch (RestClientException | JsonProcessingException | IllegalArgumentException failure) {
            // Provider bodies can contain user data or provider details, so they are deliberately not exposed or logged.
            throw new IllegalStateException("Không nhận được gợi ý AI lúc này. Hãy đợi trước khi thử lại.");
        }
    }

    static Map<String, Object> providerInput(WeeklyInsightService.Snapshot snapshot) {
        Map<Long, int[]> counts = new LinkedHashMap<>();
        Map<Long, String> names = new LinkedHashMap<>();
        for (var row : snapshot.evidence()) {
            int[] current = counts.computeIfAbsent(row.habitId(), ignored -> new int[3]);
            names.putIfAbsent(row.habitId(), row.habitName());
            switch (row.status()) {
                case COMPLETED -> current[0]++;
                case FAILED -> current[1]++;
                case SKIPPED -> current[2]++;
            }
        }
        var habits = counts.entrySet().stream()
                .map(entry -> Map.<String, Object>of("id", entry.getKey(), "name", names.get(entry.getKey()),
                        "completed", entry.getValue()[0], "failed", entry.getValue()[1], "skipped", entry.getValue()[2]))
                .sorted(Comparator.<Map<String, Object>, Integer>comparing(row -> (Integer) row.get("failed")).reversed()
                        .thenComparing(Comparator.<Map<String, Object>, Integer>comparing(row -> (Integer) row.get("skipped")).reversed())
                        .thenComparing(row -> (Long) row.get("id")))
                .limit(6).toList();
        return Map.of(
                "weekStart", snapshot.weekStart().toString(),
                "observedThrough", snapshot.observedThrough().toString(),
                "recorded", Map.of("completed", snapshot.completed(), "failed", snapshot.failed(), "skipped", snapshot.skipped()),
                "focus", Map.of("completedSessions", snapshot.focusSessions(), "configuredMinutes", snapshot.focusMinutes()),
                "habits", habits,
                "limitations", "Only recorded check-ins are included. Missing check-ins are not failures. Journal text, check-in notes, account identity and exact session notes are excluded.");
    }

    static Advice parse(JsonNode response, WeeklyInsightService.Snapshot snapshot) {
        if (response == null) throw new IllegalArgumentException("Missing provider response");
        String content = response.path("choices").path(0).path("message").path("content").asText(null);
        if (content == null) throw new IllegalArgumentException("Missing provider content");
        try {
            JsonNode value = new ObjectMapper().readTree(content);
            String headline = requiredText(value.get("headline"), 280);
            JsonNode observationRows = value.get("observations");
            JsonNode experimentRows = value.get("experiments");
            if (observationRows == null || !observationRows.isArray() || observationRows.isEmpty() || observationRows.size() > 3
                    || experimentRows == null || !experimentRows.isArray() || experimentRows.isEmpty() || experimentRows.size() > 3) {
                throw new IllegalArgumentException("Invalid provider content");
            }
            Set<Long> allowed = snapshot.evidence().stream().map(WeeklyInsightService.Evidence::habitId).collect(java.util.stream.Collectors.toSet());
            var observations = new ArrayList<Observation>();
            for (JsonNode row : observationRows) {
                if (!row.path("habitId").canConvertToLong()) throw new IllegalArgumentException("Invalid provider habit");
                long habitId = row.path("habitId").longValue();
                if (habitId < 1 || !allowed.contains(habitId)) throw new IllegalArgumentException("Unknown provider habit");
                observations.add(new Observation(habitId, requiredText(row.get("text"), 420)));
            }
            if (observations.stream().map(Observation::habitId).distinct().count() != observations.size()) {
                throw new IllegalArgumentException("Duplicate provider habit");
            }
            var experiments = new ArrayList<String>();
            for (JsonNode row : experimentRows) experiments.add(requiredText(row, 280));
            return new Advice(headline, List.copyOf(observations), List.copyOf(experiments));
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("Invalid provider JSON", failure);
        }
    }

    private static String requiredText(JsonNode node, int maximum) {
        if (node == null || !node.isTextual()) throw new IllegalArgumentException("Missing text");
        String value = node.textValue().trim();
        if (value.isEmpty() || value.length() > maximum) throw new IllegalArgumentException("Invalid text");
        return value;
    }

    private static String systemInstruction(String language) {
        String outputLanguage = "en".equals(language) ? "English" : "Vietnamese";
        return "You are SelfForge's weekly habit coach. Write in " + outputLanguage + ". "
                + "Use only supplied recorded evidence. Do not diagnose, claim causes, invent missed days, infer private journal content, or change any plan. "
                + "State observations as tentative experiments, not facts about the person. Return only JSON: "
                + "{headline:string, observations:[{habitId:number,text:string}], experiments:[string]}. "
                + "Give one to three observations and one to three small, practical experiments.";
    }

    private static String prompt(String language, String input) {
        return "Language: " + ("en".equals(language) ? "en" : "vi") + "\nRecorded weekly data:\n" + input;
    }
}
