package com.teachercabinet.server.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

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
@Table(name = "lesson_journal_material")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonJournalMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "lesson_journal_material_id")
    private Long lessonJournalMaterialId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_journal_id", nullable = false)
    private LessonJournal lessonJournal;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "url", length = 1000)
    private String url;

    @Column(name = "source", length = 500)
    private String source;

    @Column(length = 500)
    private String topic;

    @Column(length = 100)
    private String domain;

    @Column(name = "data_type", length = 100)
    private String dataType;

    @Column(name = "page")
    private Integer page;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
