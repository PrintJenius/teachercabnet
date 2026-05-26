package com.teachercabinet.server.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachercabinet.server.entity.StudentJournal;

public interface StudentJournalRepository extends JpaRepository<StudentJournal, Long> {
    List<StudentJournal> findByTeacherTeacherIdAndTargetDate(Long teacherId, LocalDate targetDate);

    Optional<StudentJournal> findByTeacherTeacherIdAndStudentStudentIdAndTargetDate(
            Long teacherId,
            Long studentId,
            LocalDate targetDate);

    List<StudentJournal> findByTeacherTeacherIdAndStudentStudentIdOrderByTargetDateDesc(
            Long teacherId,
            Long studentId);
}
