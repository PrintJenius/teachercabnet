package com.teachercabinet.server.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.teachercabinet.server.entity.LessonMaterialSelectLog;

public interface LessonMaterialSelectLogRepository extends JpaRepository<LessonMaterialSelectLog, Long> {

    long countByCreatedAtAfter(LocalDateTime after);

    @Query("""
            SELECT s FROM LessonMaterialSelectLog s
            JOIN FETCH s.teacher
            LEFT JOIN FETCH s.searchLog
            ORDER BY s.createdAt DESC
            """)
    List<LessonMaterialSelectLog> findRecent(Pageable pageable);
}
