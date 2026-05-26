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
@Table(name = "lesson_material_select_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonMaterialSelectLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "select_log_id")
    private Long selectLogId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "search_log_id")
    private LessonSearchLog searchLog;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "source", length = 500)
    private String source;

    @Column(name = "url", length = 1000)
    private String url;

    @Column(name = "page")
    private Integer page;

    @Column(length = 100)
    private String domain;

    @Column(length = 500)
    private String topic;

    @Column(name = "data_type", length = 100)
    private String dataType;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
