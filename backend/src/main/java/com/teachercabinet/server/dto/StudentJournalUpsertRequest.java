package com.teachercabinet.server.dto;

import java.time.LocalDate;
import java.util.List;

public record StudentJournalUpsertRequest(
        Long studentId,
        LocalDate targetDate,
        List<StudentJournalEntryDto> entries
) {}
