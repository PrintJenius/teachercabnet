package com.teachercabinet.server.dto;

public record LessonJournalMaterialRequest(
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
