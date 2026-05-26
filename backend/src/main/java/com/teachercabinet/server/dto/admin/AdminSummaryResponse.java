package com.teachercabinet.server.dto.admin;

public record AdminSummaryResponse(
        long totalSearches,
        long totalMaterialSelects,
        long searchesLast7Days,
        long selectsLast7Days
) {
}
