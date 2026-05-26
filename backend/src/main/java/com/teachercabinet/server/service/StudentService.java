package com.teachercabinet.server.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.teachercabinet.server.dto.StudentCreateRequest;
import com.teachercabinet.server.dto.StudentResponse;
import com.teachercabinet.server.entity.Student;
import com.teachercabinet.server.entity.Teacher;
import com.teachercabinet.server.enums.StudentStatus;
import com.teachercabinet.server.repository.StudentRepository;
import com.teachercabinet.server.repository.TeacherRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudentService {
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;

    @Transactional
    public StudentResponse createStudent(Long teacherId, StudentCreateRequest request) {
        if (teacherId == null || teacherId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 teacherId가 필요합니다.");
        }
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 필요합니다.");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름(name)은 필수입니다.");
        }
        if (request.birthDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "생년월일(birthDate)은 필수입니다.");
        }

        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "선생님을 찾을 수 없습니다."));

        Student student = Student.builder()
                .teacher(teacher)
                .name(request.name().trim())
                .birthDate(request.birthDate())
                .profileImageUrl(toNullable(request.profileImageUrl()))
                .status(StudentStatus.ACTIVE)
                .graduatedAt(null)
                .build();

        return StudentResponse.from(studentRepository.save(student));
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> getStudents(Long teacherId) {
        if (teacherId == null || teacherId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 teacherId가 필요합니다.");
        }

        return studentRepository.findByTeacherTeacherIdOrderByStudentIdDesc(teacherId)
                .stream()
                .map(StudentResponse::from)
                .toList();
    }

    @Transactional
    public void deleteStudent(Long teacherId, Long studentId) {
        if (teacherId == null || teacherId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 teacherId가 필요합니다.");
        }
        if (studentId == null || studentId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 studentId가 필요합니다.");
        }

        Student student = studentRepository.findByStudentIdAndTeacherTeacherId(studentId, teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 아이를 찾을 수 없습니다."));

        studentRepository.delete(student);
    }

    @Transactional
    public StudentResponse graduateStudent(Long teacherId, Long studentId) {
        if (teacherId == null || teacherId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 teacherId가 필요합니다.");
        }
        if (studentId == null || studentId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 studentId가 필요합니다.");
        }

        Student student = studentRepository.findByStudentIdAndTeacherTeacherId(studentId, teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "아이를 찾을 수 없습니다."));

        if (student.getStatus() == StudentStatus.GRADUATED) {
            return StudentResponse.from(student);
        }

        student.setStatus(StudentStatus.GRADUATED);
        student.setGraduatedAt(LocalDate.now());
        return StudentResponse.from(student);
    }

    private String toNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
