package com.teachercabinet.server.dto.admin;

import java.time.LocalDateTime;

public record AdminSelectLogItemResponse(
        Long selectLogId,
        Long teacherId,
        String teacherNickname,
        Long searchLogId,
        String title,
        String source,
        String url,
        Integer page,
        String domain,
        String topic,
        String dataType,
        LocalDateTime createdAt
) {
}
