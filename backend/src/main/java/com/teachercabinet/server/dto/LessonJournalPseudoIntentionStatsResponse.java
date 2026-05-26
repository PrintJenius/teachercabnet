package com.teachercabinet.server.dto;

import java.util.List;

public record LessonJournalPseudoIntentionStatsResponse(
        int year,
        int month,
        int totalCount,
        List<ScoreCount> byScore
) {
    public record ScoreCount(int score, int count) {
    }
}
