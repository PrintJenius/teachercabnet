package com.teachercabinet.server.dto;

public record StudentJournalEntryDto(
        String photoUrl,
        String memo,
        Integer sortOrder
) {}
