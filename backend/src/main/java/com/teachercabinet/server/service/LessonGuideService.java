package com.teachercabinet.server.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teachercabinet.server.dto.LessonGuideAskResponse;
import com.teachercabinet.server.dto.LessonGuideReferenceResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LessonGuideService {
    private static final Logger log = LoggerFactory.getLogger(LessonGuideService.class);
    private static final Set<Integer> RAG_ASK_RETRY_STATUSES = Set.of(502, 503, 504);
    private static final int RAG_ASK_MAX_ATTEMPTS = 2;

    private final ObjectMapper objectMapper;
    private final LessonActivityService lessonActivityService;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Value("${app.rag-server.base-url:http://localhost:8001}")
    private String ragBaseUrl;

    @Value("${app.rag-server.namespace:play_data}")
    private String ragNamespace;

    @Value("${app.rag-server.top-k:5}")
    private int ragTopK;

    @Value("${app.rag-server.wake-max-attempts:20}")
    private int ragWakeMaxAttempts;

    @Value("${app.rag-server.wake-interval-ms:3000}")
    private long ragWakeIntervalMs;

    public LessonGuideAskResponse ask(Long teacherId, String question) {
        String trimmed = question == null ? "" : question.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "질문을 입력해 주세요.");
        }

        JsonNode ragBody = callRagAsk(trimmed);
        String answer = ragBody.path("answer").asText(null);
        if (answer == null || answer.isBlank()) {
            answer = "관련 자료를 찾지 못했습니다. 다른 키워드로 질문해 보세요.";
        }

        List<LessonGuideReferenceResponse> references = new ArrayList<>();
        JsonNode refs = ragBody.path("references");
        if (refs.isArray()) {
            for (JsonNode ref : refs) {
                references.add(new LessonGuideReferenceResponse(
                        ref.path("title").asText("제목 없음"),
                        ref.path("description").asText(""),
                        textOrNull(ref, "url"),
                        ref.path("score").isNumber() ? ref.path("score").asDouble() : null,
                        textOrNull(ref, "source"),
                        textOrNull(ref, "topic"),
                        textOrNull(ref, "domain"),
                        textOrNull(ref, "data_type"),
                        intOrNull(ref, "page")));
            }
        }

        long searchLogId = lessonActivityService.recordSearch(teacherId, trimmed, references);
        return new LessonGuideAskResponse(answer, references, searchLogId);
    }

    private JsonNode callRagAsk(String question) {
        try {
            ensureRagReady();
            return postRagAskWithRetry(question);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "자료 검색 요청 중 오류: " + e.getMessage());
        }
    }

    /** Render cold start: /health 폴링으로 RAG 기동·ready 확인 */
    private void ensureRagReady() {
        String healthUrl = normalizedRagBaseUrl() + "/health";
        int maxAttempts = Math.max(1, ragWakeMaxAttempts);
        long intervalMs = Math.max(500L, ragWakeIntervalMs);

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(healthUrl))
                        .timeout(Duration.ofSeconds(15))
                        .GET()
                        .build();
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    if (attempt > 1) {
                        log.info("[RAG] health ready after {} attempt(s)", attempt);
                    }
                    return;
                }
                log.info("[RAG] health status={}, attempt={}/{}", response.statusCode(), attempt, maxAttempts);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "자료 검색 서버 준비가 중단되었습니다.");
            } catch (Exception e) {
                log.info("[RAG] health unreachable, attempt={}/{}: {}", attempt, maxAttempts, e.getMessage());
            }

            if (attempt < maxAttempts) {
                try {
                    Thread.sleep(intervalMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "자료 검색 서버 준비가 중단되었습니다.");
                }
            }
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "자료 검색 서버를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    private JsonNode postRagAskWithRetry(String question) throws Exception {
        ResponseStatusException lastFailure = null;

        for (int attempt = 1; attempt <= RAG_ASK_MAX_ATTEMPTS; attempt++) {
            HttpResponse<String> response = postRagAsk(question);
            int status = response.statusCode();
            if (status == 200) {
                return objectMapper.readTree(response.body());
            }

            lastFailure = new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    formatRagFailure(status, response.body(), objectMapper));

            if (!RAG_ASK_RETRY_STATUSES.contains(status) || attempt >= RAG_ASK_MAX_ATTEMPTS) {
                throw lastFailure;
            }

            log.warn("[RAG] ask status={}, re-warming via health (attempt {}/{})",
                    status, attempt, RAG_ASK_MAX_ATTEMPTS);
            ensureRagReady();
        }

        throw lastFailure != null
                ? lastFailure
                : new ResponseStatusException(HttpStatus.BAD_GATEWAY, "자료 검색 요청에 실패했습니다.");
    }

    private HttpResponse<String> postRagAsk(String question) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("question", question);
        payload.put("namespace", ragNamespace);
        payload.put("top_k", ragTopK);
        payload.put("include_answer", true);

        String body = objectMapper.writeValueAsString(payload);
        String endpoint = normalizedRagBaseUrl() + "/api/ask";
        log.info("[RAG] request endpoint={}, namespace={}, questionLength={}",
                endpoint, ragNamespace, question.length());

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(120))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        log.info("[RAG] response status={}", response.statusCode());
        return response;
    }

    private String normalizedRagBaseUrl() {
        return ragBaseUrl.replaceAll("/+$", "");
    }

    private static String formatRagFailure(int statusCode, String body, ObjectMapper objectMapper) {
        String detail = extractRagDetail(body, objectMapper);
        if (detail != null && !detail.isBlank()) {
            return "자료 검색 서버 오류 (HTTP " + statusCode + "): " + detail;
        }
        return "자료 검색 서버 오류 (HTTP " + statusCode
                + "). rag-server(8001) 실행 여부와 GEMINI/PINECONE 설정을 확인해 주세요.";
    }

    private static String extractRagDetail(String body, ObjectMapper objectMapper) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode detail = root.path("detail");
            if (detail.isTextual()) {
                return detail.asText();
            }
            if (detail.isArray() && detail.size() > 0) {
                return detail.get(0).asText("");
            }
            JsonNode message = root.path("message");
            if (message.isTextual()) {
                return message.asText();
            }
        } catch (Exception ignored) {
            // JSON이 아니면 본문 일부를 그대로 사용
        }
        String trimmed = body.trim();
        return trimmed.length() > 300 ? trimmed.substring(0, 300) + "…" : trimmed;
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text.isBlank() ? null : text;
    }

    private static Integer intOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        if (value.isInt() || value.isLong()) {
            return value.asInt();
        }
        if (value.isNumber()) {
            return value.asInt();
        }
        if (value.isTextual()) {
            try {
                return Integer.parseInt(value.asText().trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
