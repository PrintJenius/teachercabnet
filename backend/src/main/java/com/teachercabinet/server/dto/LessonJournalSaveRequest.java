package com.teachercabinet.server.dto;

import java.time.LocalDate;
import java.util.List;

public record LessonJournalSaveRequest(
        LocalDate targetDate,
        Integer pseudoIntentionScore,
        List<LessonJournalMaterialRequest> materials
) {
}
