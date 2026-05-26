package com.teachercabinet.server.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachercabinet.server.entity.StudentJournalEntry;

public interface StudentJournalEntryRepository extends JpaRepository<StudentJournalEntry, Long> {
    void deleteByJournalJournalId(Long journalId);

    List<StudentJournalEntry> findByJournalJournalIdOrderBySortOrderAscEntryIdAsc(Long journalId);
}
