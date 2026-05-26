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
@Table(name = "lesson_search_result_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonSearchResultLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "result_log_id")
    private Long resultLogId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "search_log_id", nullable = false)
    private LessonSearchLog searchLog;

    @Column(name = "rank_order", nullable = false)
    private int rankOrder;

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

    private Double score;
}
