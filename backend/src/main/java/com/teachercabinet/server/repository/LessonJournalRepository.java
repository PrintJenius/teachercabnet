package com.teachercabinet.server.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teachercabinet.server.entity.LessonJournal;

public interface LessonJournalRepository extends JpaRepository<LessonJournal, Long> {

    @Query("""
            SELECT DISTINCT j FROM LessonJournal j
            LEFT JOIN FETCH j.materials
            WHERE j.teacher.teacherId = :teacherId AND j.targetDate = :targetDate
            """)
    Optional<LessonJournal> findByTeacherIdAndTargetDateWithMaterials(
            @Param("teacherId") Long teacherId,
            @Param("targetDate") LocalDate targetDate);

    @Query("""
            SELECT DISTINCT j.targetDate FROM LessonJournal j
            WHERE j.teacher.teacherId = :teacherId
            ORDER BY j.targetDate DESC
            """)
    List<LocalDate> findDatesByTeacherId(@Param("teacherId") Long teacherId);

    @Query("""
            SELECT j.pseudoIntentionScore, COUNT(j)
            FROM LessonJournal j
            WHERE j.teacher.teacherId = :teacherId
              AND j.pseudoIntentionScore IS NOT NULL
              AND j.targetDate >= :startDate
              AND j.targetDate <= :endDate
            GROUP BY j.pseudoIntentionScore
            """)
    List<Object[]> countPseudoIntentionScoresByMonth(
            @Param("teacherId") Long teacherId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
