package com.teachercabinet.server.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teachercabinet.server.dto.StudentCreateRequest;
import com.teachercabinet.server.dto.StudentResponse;
import com.teachercabinet.server.security.JwtPrincipal;
import com.teachercabinet.server.service.StudentService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/students")
public class StudentController {
    private final StudentService studentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentResponse createStudent(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestBody StudentCreateRequest request) {
        return studentService.createStudent(principal.teacherId(), request);
    }

    @GetMapping
    public List<StudentResponse> getStudents(@AuthenticationPrincipal JwtPrincipal principal) {
        return studentService.getStudents(principal.teacherId());
    }

    @DeleteMapping("/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStudent(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable("studentId") Long studentId) {
        studentService.deleteStudent(principal.teacherId(), studentId);
    }

    @PatchMapping("/{studentId}/graduate")
    public StudentResponse graduateStudent(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable("studentId") Long studentId) {
        return studentService.graduateStudent(principal.teacherId(), studentId);
    }
}
