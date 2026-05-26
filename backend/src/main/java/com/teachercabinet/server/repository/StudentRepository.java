package com.teachercabinet.server.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachercabinet.server.entity.Student;
import com.teachercabinet.server.enums.StudentStatus;

public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findByTeacherTeacherIdOrderByStudentIdDesc(Long teacherId);
    List<Student> findByTeacherTeacherIdAndStatusOrderByStudentIdDesc(Long teacherId, StudentStatus status);

    Optional<Student> findByStudentIdAndTeacherTeacherId(Long studentId, Long teacherId);
}
