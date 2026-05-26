package com.teachercabinet.server.service;



import java.time.LocalDate;

import java.util.ArrayList;

import java.util.List;

import java.util.Map;

import java.util.function.Function;

import java.util.stream.Collectors;



import org.springframework.http.HttpStatus;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.server.ResponseStatusException;



import com.teachercabinet.server.dto.StudentJournalEntryDto;

import com.teachercabinet.server.dto.StudentJournalItemResponse;

import com.teachercabinet.server.dto.StudentJournalUpsertRequest;

import com.teachercabinet.server.entity.Student;

import com.teachercabinet.server.entity.StudentJournal;

import com.teachercabinet.server.entity.StudentJournalEntry;

import com.teachercabinet.server.enums.StudentStatus;

import com.teachercabinet.server.repository.StudentJournalRepository;

import com.teachercabinet.server.repository.StudentRepository;



import lombok.RequiredArgsConstructor;



@Service

@RequiredArgsConstructor

public class StudentJournalService {

    private final StudentRepository studentRepository;

    private final StudentJournalRepository studentJournalRepository;



    @Transactional(readOnly = true)

    public List<StudentJournalItemResponse> getJournals(Long teacherId, LocalDate targetDate) {

        validateTeacherId(teacherId);

        if (targetDate == null) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 날짜(targetDate)는 필수입니다.");

        }



        List<Student> students = studentRepository.findByTeacherTeacherIdAndStatusOrderByStudentIdDesc(

                teacherId, StudentStatus.ACTIVE);

        Map<Long, StudentJournal> journalByStudentId = studentJournalRepository

                .findByTeacherTeacherIdAndTargetDate(teacherId, targetDate)

                .stream()

                .collect(Collectors.toMap(journal -> journal.getStudent().getStudentId(), Function.identity()));



        return students.stream()

                .map(student -> toItemResponse(student, targetDate, journalByStudentId.get(student.getStudentId())))

                .toList();

    }



    @Transactional(readOnly = true)

    public List<StudentJournalItemResponse> getJournalsForView(Long teacherId, LocalDate targetDate) {

        validateTeacherId(teacherId);

        if (targetDate == null) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 날짜(targetDate)는 필수입니다.");

        }



        List<Student> students = studentRepository.findByTeacherTeacherIdOrderByStudentIdDesc(teacherId);

        Map<Long, StudentJournal> journalByStudentId = studentJournalRepository

                .findByTeacherTeacherIdAndTargetDate(teacherId, targetDate)

                .stream()

                .collect(Collectors.toMap(journal -> journal.getStudent().getStudentId(), Function.identity()));



        return students.stream()

                .map(student -> toItemResponse(student, targetDate, journalByStudentId.get(student.getStudentId())))

                .toList();

    }



    @Transactional

    public StudentJournalItemResponse upsertJournal(Long teacherId, StudentJournalUpsertRequest request) {

        validateTeacherId(teacherId);

        if (request == null) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 필요합니다.");

        }

        if (request.studentId() == null || request.studentId() < 1) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 studentId가 필요합니다.");

        }

        if (request.targetDate() == null) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetDate는 필수입니다.");

        }



        Student student = studentRepository.findByStudentIdAndTeacherTeacherId(request.studentId(), teacherId)

                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "아이를 찾을 수 없습니다."));

        if (student.getStatus() != StudentStatus.ACTIVE) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "졸업/중도퇴원 아이는 일지를 작성할 수 없습니다.");

        }



        StudentJournal journal = studentJournalRepository

                .findByTeacherTeacherIdAndStudentStudentIdAndTargetDate(teacherId, request.studentId(), request.targetDate())

                .orElse(StudentJournal.builder()

                        .teacher(student.getTeacher())

                        .student(student)

                        .targetDate(request.targetDate())

                        .build());



        journal.getEntries().clear();

        List<StudentJournalEntryDto> entryDtos = request.entries() == null ? List.of() : request.entries();

        int sortOrder = 0;

        for (StudentJournalEntryDto entryDto : entryDtos) {

            String photoUrl = toNullable(entryDto.photoUrl());

            String memo = toNullable(entryDto.memo());

            if (photoUrl == null && memo == null) {

                continue;

            }

            journal.getEntries().add(StudentJournalEntry.builder()

                    .journal(journal)

                    .photoUrl(photoUrl)

                    .memo(memo)

                    .sortOrder(entryDto.sortOrder() == null ? sortOrder : entryDto.sortOrder())

                    .build());

            sortOrder += 1;

        }



        StudentJournal saved = studentJournalRepository.save(journal);

        return toItemResponse(student, saved.getTargetDate(), saved);

    }



    private StudentJournalItemResponse toItemResponse(Student student, LocalDate targetDate, StudentJournal journal) {

        return new StudentJournalItemResponse(

                student.getStudentId(),

                student.getName(),

                student.getBirthDate(),

                student.getProfileImageUrl(),

                student.getStatus(),

                targetDate,

                journal == null ? List.of() : toEntryDtos(journal));

    }



    private List<StudentJournalEntryDto> toEntryDtos(StudentJournal journal) {

        if (journal.getEntries() == null || journal.getEntries().isEmpty()) {

            return List.of();

        }

        List<StudentJournalEntryDto> result = new ArrayList<>();

        for (StudentJournalEntry entry : journal.getEntries()) {

            result.add(new StudentJournalEntryDto(

                    entry.getPhotoUrl(),

                    entry.getMemo(),

                    entry.getSortOrder()));

        }

        return result;

    }



    private void validateTeacherId(Long teacherId) {

        if (teacherId == null || teacherId < 1) {

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 teacherId가 필요합니다.");

        }

    }



    private String toNullable(String value) {

        if (value == null || value.isBlank()) {

            return null;

        }

        return value.trim();

    }

}

