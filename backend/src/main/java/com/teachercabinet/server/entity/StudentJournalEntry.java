package com.teachercabinet.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "student_journal_entry")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentJournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Long entryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "journal_id", nullable = false)
    private StudentJournal journal;

    @Column(name = "photo_url", length = 1024)
    private String photoUrl;

    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}
