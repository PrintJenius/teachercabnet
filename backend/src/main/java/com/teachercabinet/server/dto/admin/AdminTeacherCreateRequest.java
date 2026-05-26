package com.teachercabinet.server.dto.admin;

public record AdminTeacherCreateRequest(
        String loginId,
        String password,
        String nickname,
        Boolean admin
) {}
