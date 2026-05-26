package com.teachercabinet.server.dto;

public record LessonJournalMaterialResponse(
        Long materialId,
        String title,
        String description,
        String url,
        String source,
        String topic,
        String domain,
        String dataType,
        Integer page
) {
}
