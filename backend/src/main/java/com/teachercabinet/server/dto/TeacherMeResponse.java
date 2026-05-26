package com.teachercabinet.server.dto;

public record TeacherMeResponse(
        Long teacherId,
        String nickname,
        boolean admin
) {}
