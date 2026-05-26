package com.teachercabinet.server.dto;

import java.time.LocalDate;
import java.util.List;

public record LessonJournalResponse(
        Long lessonJournalId,
        LocalDate targetDate,
        List<LessonJournalMaterialResponse> materials
) {
}
