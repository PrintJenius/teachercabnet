package com.teachercabinet.server.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teachercabinet.server.entity.LessonJournalMaterial;

public interface LessonJournalMaterialRepository extends JpaRepository<LessonJournalMaterial, Long> {

    @Query("""
            SELECT m FROM LessonJournalMaterial m
            JOIN FETCH m.lessonJournal j
            WHERE m.lessonJournalMaterialId = :materialId
              AND j.teacher.teacherId = :teacherId
            """)
    Optional<LessonJournalMaterial> findByIdAndTeacherId(
            @Param("materialId") Long materialId,
            @Param("teacherId") Long teacherId);

    @Query("""
            SELECT m.domain FROM LessonJournalMaterial m
            JOIN m.lessonJournal j
            WHERE j.teacher.teacherId = :teacherId
              AND j.targetDate >= :startDate
              AND j.targetDate <= :endDate
              AND m.domain IS NOT NULL
              AND TRIM(m.domain) <> ''
            """)
    List<String> findDomainStringsByTeacherAndDateRange(
            @Param("teacherId") Long teacherId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
