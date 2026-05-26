package com.teachercabinet.server.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teachercabinet.server.entity.LessonSearchLog;

public interface LessonSearchLogRepository extends JpaRepository<LessonSearchLog, Long> {

    long countByCreatedAtAfter(LocalDateTime after);

    @Query("""
            SELECT DISTINCT l FROM LessonSearchLog l
            JOIN FETCH l.teacher
            LEFT JOIN FETCH l.results
            ORDER BY l.createdAt DESC
            """)
    List<LessonSearchLog> findRecent(Pageable pageable);

    @Query("""
            SELECT l.teacher.teacherId, l.teacher.nickname, COUNT(l)
            FROM LessonSearchLog l
            GROUP BY l.teacher.teacherId, l.teacher.nickname
            ORDER BY COUNT(l) DESC
            """)
    List<Object[]> countGroupByTeacher(Pageable pageable);
}
