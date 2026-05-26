package com.teachercabinet.server.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teachercabinet.server.dto.admin.AdminBillingLinkResponse;
import com.teachercabinet.server.dto.admin.AdminDashboardResponse;
import com.teachercabinet.server.dto.admin.AdminSearchLogItemResponse;
import com.teachercabinet.server.dto.admin.AdminSearchResultItemResponse;
import com.teachercabinet.server.dto.admin.AdminSelectLogItemResponse;
import com.teachercabinet.server.dto.admin.AdminSummaryResponse;
import com.teachercabinet.server.dto.admin.AdminTeacherSearchCountResponse;
import com.teachercabinet.server.entity.LessonMaterialSelectLog;
import com.teachercabinet.server.entity.LessonSearchLog;
import com.teachercabinet.server.entity.LessonSearchResultLog;
import com.teachercabinet.server.repository.LessonMaterialSelectLogRepository;
import com.teachercabinet.server.repository.LessonSearchLogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private static final int RECENT_LIMIT = 30;
    private static final int TOP_TEACHERS_LIMIT = 10;

    private final AdminAccessService adminAccessService;
    private final LessonSearchLogRepository lessonSearchLogRepository;
    private final LessonMaterialSelectLogRepository lessonMaterialSelectLogRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard(Long adminTeacherId) {
        adminAccessService.requireAdmin(adminTeacherId);

        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        long totalSearches = lessonSearchLogRepository.count();
        long totalSelects = lessonMaterialSelectLogRepository.count();
        long searchesWeek = lessonSearchLogRepository.countByCreatedAtAfter(weekAgo);
        long selectsWeek = lessonMaterialSelectLogRepository.countByCreatedAtAfter(weekAgo);

        AdminSummaryResponse summary = new AdminSummaryResponse(
                totalSearches,
                totalSelects,
                searchesWeek,
                selectsWeek);

        List<AdminBillingLinkResponse> billingLinks = List.of(
                new AdminBillingLinkResponse(
                        "Google AI Studio (Gemini)",
                        "API 사용량·결제 확인",
                        "https://aistudio.google.com/app/apikey"),
                new AdminBillingLinkResponse(
                        "Google Cloud Console",
                        "Cloud 프로젝트 결제·사용량 (Gemini API 연동 시)",
                        "https://console.cloud.google.com/billing"),
                new AdminBillingLinkResponse(
                        "Pinecone 콘솔",
                        "벡터 DB 사용량·요금제",
                        "https://app.pinecone.io/"));

        List<LessonSearchLog> recentSearchEntities =
                lessonSearchLogRepository.findRecent(PageRequest.of(0, RECENT_LIMIT));
        List<AdminSearchLogItemResponse> recentSearches = new ArrayList<>();
        for (LessonSearchLog log : recentSearchEntities) {
            List<AdminSearchResultItemResponse> results = log.getResults().stream()
                    .map(this::toResultItem)
                    .toList();
            recentSearches.add(new AdminSearchLogItemResponse(
                    log.getSearchLogId(),
                    log.getTeacher().getTeacherId(),
                    log.getTeacher().getNickname(),
                    log.getQuestion(),
                    log.getReferenceCount(),
                    log.getCreatedAt(),
                    results));
        }

        List<LessonMaterialSelectLog> recentSelectEntities =
                lessonMaterialSelectLogRepository.findRecent(PageRequest.of(0, RECENT_LIMIT));
        List<AdminSelectLogItemResponse> recentSelects = recentSelectEntities.stream()
                .map(s -> new AdminSelectLogItemResponse(
                        s.getSelectLogId(),
                        s.getTeacher().getTeacherId(),
                        s.getTeacher().getNickname(),
                        s.getSearchLog() != null ? s.getSearchLog().getSearchLogId() : null,
                        s.getTitle(),
                        s.getSource(),
                        s.getUrl(),
                        s.getPage(),
                        s.getDomain(),
                        s.getTopic(),
                        s.getDataType(),
                        s.getCreatedAt()))
                .toList();

        List<AdminTeacherSearchCountResponse> topTeachers = new ArrayList<>();
        for (Object[] row : lessonSearchLogRepository.countGroupByTeacher(PageRequest.of(0, TOP_TEACHERS_LIMIT))) {
            Long teacherId = (Long) row[0];
            String nickname = (String) row[1];
            long count = (Long) row[2];
            topTeachers.add(new AdminTeacherSearchCountResponse(teacherId, nickname, count));
        }

        return new AdminDashboardResponse(
                summary,
                billingLinks,
                recentSearches,
                recentSelects,
                topTeachers);
    }

    private AdminSearchResultItemResponse toResultItem(LessonSearchResultLog r) {
        return new AdminSearchResultItemResponse(
                r.getRankOrder(),
                r.getTitle(),
                r.getSource(),
                r.getUrl(),
                r.getPage(),
                r.getDomain(),
                r.getTopic(),
                r.getDataType(),
                r.getScore());
    }
}
