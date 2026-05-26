package com.teachercabinet.server.dto;

import java.time.LocalDate;

public record StudentCreateRequest(
        String name,
        LocalDate birthDate,
        String profileImageUrl) {
}
