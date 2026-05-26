package com.teachercabinet.server.dto.admin;

public record AdminSearchResultItemResponse(
        int rank,
        String title,
        String source,
        String url,
        Integer page,
        String domain,
        String topic,
        String dataType,
        Double score
) {
}
