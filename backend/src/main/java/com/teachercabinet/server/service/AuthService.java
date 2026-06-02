package com.teachercabinet.server.service;



import org.springframework.http.HttpStatus;

import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.stereotype.Service;

import org.springframework.web.server.ResponseStatusException;



import com.teachercabinet.server.dto.LoginRequest;

import com.teachercabinet.server.dto.TokenResponse;

import com.teachercabinet.server.entity.Teacher;

import com.teachercabinet.server.repository.TeacherRepository;

import com.teachercabinet.server.security.JwtService;



import lombok.RequiredArgsConstructor;



@Service

@RequiredArgsConstructor

public class AuthService {



    private final TeacherRepository teacherRepository;

    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;



    public TokenResponse login(LoginRequest request) {

        if (request == null || request.loginId() == null || request.loginId().isBlank()) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디는 필수입니다.");

        }

        if (request.password() == null || request.password().isBlank()) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 필수입니다.");

        }



        String loginId = request.loginId().trim().toLowerCase();

        Teacher teacher = teacherRepository.findByLoginId(loginId)

                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디 또는 비밀번호가 올바르지 않습니다."));



        if (!matchesPassword(request.password(), teacher.getPassword())) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디 또는 비밀번호가 올바르지 않습니다.");

        }



        String token = jwtService.createAccessToken(teacher.getTeacherId());

        long seconds = Math.max(1L, jwtService.getExpirationMs() / 1000);

        return new TokenResponse(token, "Bearer", seconds);

    }



    private boolean matchesPassword(String rawPassword, String storedPassword) {

        if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {

            return passwordEncoder.matches(rawPassword, storedPassword);

        }

        return rawPassword.equals(storedPassword);

    }

}

