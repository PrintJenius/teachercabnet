package com.teachercabinet.server.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.teachercabinet.server.dto.LessonJournalDomainStatsResponse;
import com.teachercabinet.server.dto.LessonJournalPseudoIntentionStatsResponse;
import com.teachercabinet.server.dto.LessonJournalResponse;
import com.teachercabinet.server.dto.LessonJournalSaveRequest;
import com.teachercabinet.server.security.JwtPrincipal;
import com.teachercabinet.server.service.LessonJournalService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/lesson-journals")
@RequiredArgsConstructor
public class LessonJournalController {

    private final LessonJournalService lessonJournalService;

    @GetMapping
    public LessonJournalResponse getByDate(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam("date") LocalDate date) {
        return lessonJournalService.getByDate(principal.teacherId(), date);
    }

    @GetMapping("/dates")
    public List<LocalDate> listDates(@AuthenticationPrincipal JwtPrincipal principal) {
        return lessonJournalService.listDates(principal.teacherId());
    }

    @GetMapping("/pseudo-intention-stats")
    public LessonJournalPseudoIntentionStatsResponse getPseudoIntentionStats(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam int year,
            @RequestParam int month) {
        return lessonJournalService.getPseudoIntentionStats(principal.teacherId(), year, month);
    }

    @GetMapping("/domain-stats")
    public LessonJournalDomainStatsResponse getDomainStats(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam int year,
            @RequestParam int month) {
        return lessonJournalService.getDomainStats(principal.teacherId(), year, month);
    }

    @PostMapping
    public LessonJournalResponse appendMaterials(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestBody LessonJournalSaveRequest request) {
        return lessonJournalService.appendMaterials(principal.teacherId(), request);
    }

    @DeleteMapping("/materials/{materialId}")
    public void deleteMaterial(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable Long materialId) {
        lessonJournalService.deleteMaterial(principal.teacherId(), materialId);
    }
}
