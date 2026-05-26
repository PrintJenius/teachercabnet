package com.teachercabinet.server.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.teachercabinet.server.dto.LessonGuideReferenceResponse;
import com.teachercabinet.server.dto.LessonMaterialSelectRequest;
import com.teachercabinet.server.entity.LessonMaterialSelectLog;
import com.teachercabinet.server.entity.LessonSearchLog;
import com.teachercabinet.server.entity.LessonSearchResultLog;
import com.teachercabinet.server.entity.Teacher;
import com.teachercabinet.server.repository.LessonMaterialSelectLogRepository;
import com.teachercabinet.server.repository.LessonSearchLogRepository;
import com.teachercabinet.server.repository.TeacherRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LessonActivityService {

    private final TeacherRepository teacherRepository;
    private final LessonSearchLogRepository lessonSearchLogRepository;
    private final LessonMaterialSelectLogRepository lessonMaterialSelectLogRepository;

    @Transactional
    public long recordSearch(Long teacherId, String question, List<LessonGuideReferenceResponse> references) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "선생님 정보를 찾을 수 없습니다."));

        LessonSearchLog log = LessonSearchLog.builder()
                .teacher(teacher)
                .question(question)
                .referenceCount(references == null ? 0 : references.size())
                .build();

        if (references != null) {
            int rank = 1;
            for (LessonGuideReferenceResponse ref : references) {
                log.getResults().add(LessonSearchResultLog.builder()
                        .searchLog(log)
                        .rankOrder(rank++)
                        .title(trimOrDefault(ref.title(), "제목 없음"))
                        .source(ref.source())
                        .url(ref.url())
                        .page(ref.page())
                        .domain(ref.domain())
                        .topic(ref.topic())
                        .dataType(ref.dataType())
                        .score(ref.score())
                        .build());
            }
        }

        return lessonSearchLogRepository.save(log).getSearchLogId();
    }

    @Transactional
    public void recordMaterialSelect(Long teacherId, LessonMaterialSelectRequest request) {
        if (request == null || request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자료 제목은 필수입니다.");
        }

        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "선생님 정보를 찾을 수 없습니다."));

        LessonSearchLog searchLog = null;
        if (request.searchLogId() != null) {
            searchLog = lessonSearchLogRepository.findById(request.searchLogId())
                    .orElse(null);
            if (searchLog != null && !searchLog.getTeacher().getTeacherId().equals(teacherId)) {
                searchLog = null;
            }
        }

        LessonMaterialSelectLog selectLog = LessonMaterialSelectLog.builder()
                .teacher(teacher)
                .searchLog(searchLog)
                .title(request.title().trim())
                .source(trimToNull(request.source()))
                .url(trimToNull(request.url()))
                .page(normalizePage(request.page()))
                .domain(trimToNull(request.domain()))
                .topic(trimToNull(request.topic()))
                .dataType(trimToNull(request.dataType()))
                .build();

        lessonMaterialSelectLogRepository.save(selectLog);
    }

    private static String trimOrDefault(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static Integer normalizePage(Integer page) {
        if (page == null || page <= 0) {
            return null;
        }
        return page;
    }
}
