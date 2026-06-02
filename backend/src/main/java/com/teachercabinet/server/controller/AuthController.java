package com.teachercabinet.server.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.teachercabinet.server.dto.LoginRequest;
import com.teachercabinet.server.dto.TokenResponse;
import com.teachercabinet.server.service.AuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            TokenResponse token = authService.login(request);
            return ResponseEntity.ok(token);
        } catch (ResponseStatusException ex) {
            String message = ex.getReason() != null ? ex.getReason() : "로그인에 실패했습니다.";
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", message));
        }
    }
}
