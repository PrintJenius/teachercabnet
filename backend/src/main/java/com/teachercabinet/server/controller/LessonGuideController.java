package com.teachercabinet.server.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teachercabinet.server.dto.LessonGuideAskRequest;
import com.teachercabinet.server.dto.LessonGuideAskResponse;
import com.teachercabinet.server.security.JwtPrincipal;
import com.teachercabinet.server.service.LessonGuideService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/lesson-guides")
@RequiredArgsConstructor
public class LessonGuideController {
    private final LessonGuideService lessonGuideService;

    @PostMapping("/ask")
    public LessonGuideAskResponse ask(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestBody LessonGuideAskRequest request) {
        return lessonGuideService.ask(principal.teacherId(), request.question());
    }
}
