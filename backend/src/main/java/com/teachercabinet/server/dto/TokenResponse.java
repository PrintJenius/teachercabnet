package com.teachercabinet.server.dto;

public record TokenResponse(String accessToken, String tokenType, long expiresInSeconds) {}
