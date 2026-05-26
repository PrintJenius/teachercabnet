package com.teachercabinet.server.dto.admin;

import java.time.LocalDateTime;
import java.util.List;

public record AdminSearchLogItemResponse(
        Long searchLogId,
        Long teacherId,
        String teacherNickname,
        String question,
        int referenceCount,
        LocalDateTime createdAt,
        List<AdminSearchResultItemResponse> results
) {
}
