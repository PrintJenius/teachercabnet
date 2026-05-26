package com.teachercabinet.server.controller;



import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;



import com.teachercabinet.server.dto.TeacherMeResponse;

import com.teachercabinet.server.security.JwtPrincipal;

import com.teachercabinet.server.service.TeacherProfileService;



import lombok.RequiredArgsConstructor;



@RestController

@RequestMapping("/api/teachers")

@RequiredArgsConstructor

public class TeacherProfileController {



    private final TeacherProfileService teacherProfileService;



    @GetMapping("/me")

    public TeacherMeResponse me(@AuthenticationPrincipal JwtPrincipal principal) {

        return teacherProfileService.getMe(principal.teacherId());

    }

}

