package com.teachercabinet.server.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    private final ObjectMapper objectMapper;
    private final LessonActivityService lessonActivityService;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .build();

    @Value("${app.rag-server.base-url:http://localhost:8001}")
    private String ragBaseUrl;

    @Value("${app.rag-server.namespace:play_data}")
    private String ragNamespace;

    @Value("${app.rag-server.top-k:5}")
    private int ragTopK;

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
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("question", question);
            payload.put("namespace", ragNamespace);
            payload.put("top_k", ragTopK);
            payload.put("include_answer", true);

            String body = objectMapper.writeValueAsString(payload);
            String endpoint = ragBaseUrl.replaceAll("/+$", "") + "/api/ask";
            log.info("[RAG] request endpoint={}, namespace={}, questionLength={}",
                    endpoint, ragNamespace, question.length());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("[RAG] response status={}", response.statusCode());

            if (response.statusCode() != 200) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        formatRagFailure(response.statusCode(), response.body(), objectMapper));
            }
            return objectMapper.readTree(response.body());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "자료 검색 요청 중 오류: " + e.getMessage());
        }
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
