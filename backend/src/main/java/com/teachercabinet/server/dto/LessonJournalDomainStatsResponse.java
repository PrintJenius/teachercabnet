package com.teachercabinet.server.dto;

import java.util.List;

public record LessonJournalDomainStatsResponse(
        int year,
        int month,
        int totalCount,
        List<DomainCount> byDomain
) {
    public record DomainCount(String domain, int count) {
    }
}
