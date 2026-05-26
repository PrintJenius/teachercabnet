package com.teachercabinet.server.service;



import org.springframework.http.HttpStatus;

import org.springframework.stereotype.Service;

import org.springframework.web.server.ResponseStatusException;



import com.teachercabinet.server.dto.TeacherMeResponse;

import com.teachercabinet.server.entity.Teacher;

import com.teachercabinet.server.repository.TeacherRepository;



import lombok.RequiredArgsConstructor;



@Service

@RequiredArgsConstructor

public class TeacherProfileService {



    private final TeacherRepository teacherRepository;

    private final AdminAccessService adminAccessService;



    public TeacherMeResponse getMe(Long teacherId) {

        Teacher teacher = teacherRepository.findById(teacherId)

                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "선생님 정보를 찾을 수 없습니다."));

        return new TeacherMeResponse(

                teacher.getTeacherId(),

                teacher.getNickname(),

                adminAccessService.isAdmin(teacherId));

    }

}

