package com.teachercabinet.server.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.teachercabinet.server.dto.LessonJournalDomainStatsResponse;
import com.teachercabinet.server.dto.LessonJournalDomainStatsResponse.DomainCount;
import com.teachercabinet.server.dto.LessonJournalMaterialRequest;
import com.teachercabinet.server.dto.LessonJournalMaterialResponse;
import com.teachercabinet.server.dto.LessonJournalPseudoIntentionStatsResponse;
import com.teachercabinet.server.dto.LessonJournalPseudoIntentionStatsResponse.ScoreCount;
import com.teachercabinet.server.dto.LessonJournalResponse;
import com.teachercabinet.server.dto.LessonJournalSaveRequest;
import com.teachercabinet.server.entity.LessonJournal;
import com.teachercabinet.server.entity.LessonJournalMaterial;
import com.teachercabinet.server.entity.Teacher;
import com.teachercabinet.server.repository.LessonJournalMaterialRepository;
import com.teachercabinet.server.repository.LessonJournalRepository;
import com.teachercabinet.server.repository.TeacherRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LessonJournalService {

    private static final List<String> KNOWN_DOMAINS = List.of(
            "신체운동·건강",
            "의사소통",
            "사회관계",
            "예술경험",
            "자연탐구");

    private final LessonJournalRepository lessonJournalRepository;
    private final LessonJournalMaterialRepository lessonJournalMaterialRepository;
    private final TeacherRepository teacherRepository;

    @Transactional(readOnly = true)
    public LessonJournalResponse getByDate(Long teacherId, LocalDate targetDate) {
        validateTeacherId(teacherId);
        if (targetDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 날짜(targetDate)는 필수입니다.");
        }

        return lessonJournalRepository
                .findByTeacherIdAndTargetDateWithMaterials(teacherId, targetDate)
                .map(this::toResponse)
                .orElse(new LessonJournalResponse(null, targetDate, List.of()));
    }

    @Transactional(readOnly = true)
    public List<LocalDate> listDates(Long teacherId) {
        validateTeacherId(teacherId);
        return lessonJournalRepository.findDatesByTeacherId(teacherId);
    }

    @Transactional(readOnly = true)
    public LessonJournalPseudoIntentionStatsResponse getPseudoIntentionStats(
            Long teacherId, int year, int month) {
        validateTeacherId(teacherId);
        if (month < 1 || month > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month는 1~12 사이여야 합니다.");
        }
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();

        Map<Integer, Integer> countByScore = new HashMap<>();
        for (int score = 1; score <= 5; score++) {
            countByScore.put(score, 0);
        }

        List<Object[]> rows = lessonJournalRepository.countPseudoIntentionScoresByMonth(
                teacherId, start, end);
        int total = 0;
        for (Object[] row : rows) {
            Integer score = (Integer) row[0];
            Long count = (Long) row[1];
            if (score != null && score >= 1 && score <= 5 && count != null) {
                countByScore.put(score, count.intValue());
                total += count.intValue();
            }
        }

        List<ScoreCount> byScore = new ArrayList<>();
        for (int score = 1; score <= 5; score++) {
            byScore.add(new ScoreCount(score, countByScore.get(score)));
        }

        return new LessonJournalPseudoIntentionStatsResponse(year, month, total, byScore);
    }

    @Transactional(readOnly = true)
    public LessonJournalDomainStatsResponse getDomainStats(Long teacherId, int year, int month) {
        validateTeacherId(teacherId);
        if (month < 1 || month > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month는 1~12 사이여야 합니다.");
        }
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();

        Map<String, Integer> countByDomain = new HashMap<>();
        for (String domain : KNOWN_DOMAINS) {
            countByDomain.put(domain, 0);
        }

        List<String> domainStrings = lessonJournalMaterialRepository.findDomainStringsByTeacherAndDateRange(
                teacherId, start, end);
        int total = 0;
        for (String raw : domainStrings) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            for (String part : raw.split(",")) {
                String domain = part.trim();
                if (countByDomain.containsKey(domain)) {
                    countByDomain.merge(domain, 1, Integer::sum);
                    total++;
                }
            }
        }

        List<DomainCount> byDomain = new ArrayList<>();
        for (String domain : KNOWN_DOMAINS) {
            byDomain.add(new DomainCount(domain, countByDomain.get(domain)));
        }

        return new LessonJournalDomainStatsResponse(year, month, total, byDomain);
    }

    @Transactional
    public LessonJournalResponse appendMaterials(Long teacherId, LessonJournalSaveRequest request) {
        validateTeacherId(teacherId);
        if (request.targetDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수업 날짜(targetDate)는 필수입니다.");
        }
        if (request.materials() == null || request.materials().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "저장할 자료를 1건 이상 선택해 주세요.");
        }
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "교사 정보를 찾을 수 없습니다."));

        LessonJournal journal = lessonJournalRepository
                .findByTeacherIdAndTargetDateWithMaterials(teacherId, request.targetDate())
                .orElseGet(() -> LessonJournal.builder()
                        .teacher(teacher)
                        .targetDate(request.targetDate())
                        .build());

        if (request.pseudoIntentionScore() != null) {
            validatePseudoIntentionScore(request.pseudoIntentionScore());
            journal.setPseudoIntentionScore(request.pseudoIntentionScore());
        }

        for (LessonJournalMaterialRequest materialRequest : request.materials()) {
            if (materialRequest.title() == null || materialRequest.title().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자료 제목은 필수입니다.");
            }
            if (isManualEntry(materialRequest)
                    && (materialRequest.domain() == null || materialRequest.domain().isBlank())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "누리과정 영역은 필수입니다.");
            }
            LessonJournalMaterial material = LessonJournalMaterial.builder()
                    .lessonJournal(journal)
                    .title(materialRequest.title().trim())
                    .description(trimToNull(materialRequest.description()))
                    .url(trimToNull(materialRequest.url()))
                    .source(trimToNull(materialRequest.source()))
                    .topic(trimToNull(materialRequest.topic()))
                    .domain(trimToNull(materialRequest.domain()))
                    .dataType(trimToNull(materialRequest.dataType()))
                    .page(normalizePage(materialRequest.page()))
                    .build();
            journal.getMaterials().add(material);
        }

        LessonJournal saved = lessonJournalRepository.save(journal);
        return toResponse(saved);
    }

    @Transactional
    public void deleteMaterial(Long teacherId, Long materialId) {
        validateTeacherId(teacherId);
        if (materialId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "materialId는 필수입니다.");
        }

        LessonJournalMaterial material = lessonJournalMaterialRepository
                .findByIdAndTeacherId(materialId, teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "자료를 찾을 수 없습니다."));

        LessonJournal journal = material.getLessonJournal();
        journal.getMaterials().removeIf(m -> Objects.equals(m.getLessonJournalMaterialId(), materialId));

        if (journal.getMaterials().isEmpty()) {
            lessonJournalRepository.delete(journal);
        } else {
            lessonJournalRepository.save(journal);
        }
    }

    private LessonJournalResponse toResponse(LessonJournal journal) {
        List<LessonJournalMaterialResponse> materials = journal.getMaterials().stream()
                .map(m -> new LessonJournalMaterialResponse(
                        m.getLessonJournalMaterialId(),
                        m.getTitle(),
                        m.getDescription(),
                        m.getUrl(),
                        m.getSource(),
                        m.getTopic(),
                        m.getDomain(),
                        m.getDataType(),
                        m.getPage()))
                .toList();

        return new LessonJournalResponse(
                journal.getLessonJournalId(),
                journal.getTargetDate(),
                materials);
    }

    private void validateTeacherId(Long teacherId) {
        if (teacherId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
    }

    private boolean isManualEntry(LessonJournalMaterialRequest materialRequest) {
        return "직접 입력".equals(trimToNull(materialRequest.source()));
    }

    private void validatePseudoIntentionScore(Integer score) {
        if (score == null || score < 1 || score > 5) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "신의사예자 점수는 1~5 사이여야 합니다.");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Integer normalizePage(Integer page) {
        if (page == null || page <= 0) {
            return null;
        }
        return page;
    }
}
