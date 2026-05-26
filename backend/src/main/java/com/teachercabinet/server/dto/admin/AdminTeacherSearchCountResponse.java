package com.teachercabinet.server.dto.admin;

public record AdminTeacherSearchCountResponse(
        Long teacherId,
        String nickname,
        long searchCount
) {
}
