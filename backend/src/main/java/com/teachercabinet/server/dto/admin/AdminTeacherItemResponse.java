package com.teachercabinet.server.dto.admin;

import java.time.LocalDateTime;

public record AdminTeacherItemResponse(
        Long teacherId,
        String loginId,
        String nickname,
        boolean admin,
        LocalDateTime createdAt
) {}
