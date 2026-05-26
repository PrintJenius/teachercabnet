package com.teachercabinet.server.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.teachercabinet.server.entity.Student;
import com.teachercabinet.server.enums.StudentStatus;

public record StudentResponse(
        Long studentId,
        Long teacherId,
        String name,
        LocalDate birthDate,
        String profileImageUrl,
        StudentStatus status,
        LocalDate graduatedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    public static StudentResponse from(Student student) {
        return new StudentResponse(
                student.getStudentId(),
                student.getTeacher().getTeacherId(),
                student.getName(),
                student.getBirthDate(),
                student.getProfileImageUrl(),
                student.getStatus(),
                student.getGraduatedAt(),
                student.getCreatedAt(),
                student.getUpdatedAt());
    }
}
