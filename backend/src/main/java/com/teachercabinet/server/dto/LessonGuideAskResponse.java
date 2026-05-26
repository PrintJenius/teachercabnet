package com.teachercabinet.server.dto;

import java.util.List;

public record LessonGuideAskResponse(
        String answer,
        List<LessonGuideReferenceResponse> references,
        Long searchLogId
) {
}
