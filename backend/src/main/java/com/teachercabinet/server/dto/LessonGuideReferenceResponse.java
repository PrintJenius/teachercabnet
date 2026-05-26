package com.teachercabinet.server.dto;

public record LessonGuideReferenceResponse(
        String title,
        String description,
        String url,
        Double score,
        String source,
        String topic,
        String domain,
        String dataType,
        Integer page
) {
}
