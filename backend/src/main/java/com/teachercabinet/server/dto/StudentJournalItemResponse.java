package com.teachercabinet.server.dto;

import java.time.LocalDate;
import java.util.List;

import com.teachercabinet.server.enums.StudentStatus;

public record StudentJournalItemResponse(
        Long studentId,
        String studentName,
        LocalDate birthDate,
        String profileImageUrl,
        StudentStatus status,
        LocalDate targetDate,
        List<StudentJournalEntryDto> entries
) {}
