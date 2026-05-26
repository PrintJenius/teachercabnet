package com.teachercabinet.server.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teachercabinet.server.dto.LessonMaterialSelectRequest;
import com.teachercabinet.server.security.JwtPrincipal;
import com.teachercabinet.server.service.LessonActivityService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/lesson-activity")
@RequiredArgsConstructor
public class LessonActivityController {

    private final LessonActivityService lessonActivityService;

    @PostMapping("/select-material")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void selectMaterial(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestBody LessonMaterialSelectRequest request) {
        lessonActivityService.recordMaterialSelect(principal.teacherId(), request);
    }
}
