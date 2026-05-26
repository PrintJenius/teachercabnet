package com.teachercabinet.server.controller;



import java.util.List;



import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.PostMapping;

import org.springframework.web.bind.annotation.RequestBody;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;



import com.teachercabinet.server.dto.admin.AdminDashboardResponse;

import com.teachercabinet.server.dto.admin.AdminTeacherCreateRequest;

import com.teachercabinet.server.dto.admin.AdminTeacherItemResponse;

import com.teachercabinet.server.security.JwtPrincipal;

import com.teachercabinet.server.service.AdminDashboardService;

import com.teachercabinet.server.service.AdminTeacherService;



import lombok.RequiredArgsConstructor;



@RestController

@RequestMapping("/api/admin")

@RequiredArgsConstructor

public class AdminController {



    private final AdminDashboardService adminDashboardService;

    private final AdminTeacherService adminTeacherService;



    @GetMapping("/dashboard")

    public AdminDashboardResponse dashboard(@AuthenticationPrincipal JwtPrincipal principal) {

        return adminDashboardService.getDashboard(principal.teacherId());

    }



    @GetMapping("/teachers")

    public List<AdminTeacherItemResponse> listTeachers(@AuthenticationPrincipal JwtPrincipal principal) {

        return adminTeacherService.listTeachers(principal.teacherId());

    }



    @PostMapping("/teachers")

    public AdminTeacherItemResponse createTeacher(

            @AuthenticationPrincipal JwtPrincipal principal,

            @RequestBody AdminTeacherCreateRequest request) {

        return adminTeacherService.createTeacher(principal.teacherId(), request);

    }

}

