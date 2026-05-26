package com.teachercabinet.server.controller;



import org.springframework.web.bind.annotation.PostMapping;

import org.springframework.web.bind.annotation.RequestBody;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;



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

    public TokenResponse login(@RequestBody LoginRequest request) {

        return authService.login(request);

    }

}

