package com.teachercabinet.server.dto.admin;

import java.util.List;

public record AdminDashboardResponse(
        AdminSummaryResponse summary,
        List<AdminBillingLinkResponse> billingLinks,
        List<AdminSearchLogItemResponse> recentSearches,
        List<AdminSelectLogItemResponse> recentSelects,
        List<AdminTeacherSearchCountResponse> topSearchTeachers
) {
}
