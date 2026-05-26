package com.teachercabinet.server.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.teachercabinet.server.dto.admin.AdminTeacherCreateRequest;
import com.teachercabinet.server.dto.admin.AdminTeacherItemResponse;
import com.teachercabinet.server.entity.Teacher;
import com.teachercabinet.server.repository.TeacherRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminTeacherService {

    private final TeacherRepository teacherRepository;
    private final AdminAccessService adminAccessService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<AdminTeacherItemResponse> listTeachers(Long adminTeacherId) {
        adminAccessService.requireAdmin(adminTeacherId);
        return teacherRepository.findAllByOrderByTeacherIdDesc().stream()
                .map(this::toItem)
                .toList();
    }

    @Transactional
    public AdminTeacherItemResponse createTeacher(Long adminTeacherId, AdminTeacherCreateRequest request) {
        adminAccessService.requireAdmin(adminTeacherId);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 필요합니다.");
        }

        String loginId = normalizeLoginId(request.loginId());
        String password = normalizeRequired(request.password(), "비밀번호");
        String nickname = normalizeRequired(request.nickname(), "닉네임");

        if (loginId.length() < 2 || loginId.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디는 2~100자여야 합니다.");
        }
        if (password.length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 4자 이상이어야 합니다.");
        }
        if (nickname.length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임은 50자 이하여야 합니다.");
        }

        if (teacherRepository.existsByLoginId(loginId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다.");
        }
        if (teacherRepository.existsByNickname(nickname)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다.");
        }

        boolean isAdmin = Boolean.TRUE.equals(request.admin());
        Teacher saved = teacherRepository.save(Teacher.builder()
                .loginId(loginId)
                .password(passwordEncoder.encode(password))
                .nickname(nickname)
                .isAdmin(isAdmin)
                .build());

        return toItem(saved);
    }

    private AdminTeacherItemResponse toItem(Teacher teacher) {
        return new AdminTeacherItemResponse(
                teacher.getTeacherId(),
                teacher.getLoginId(),
                teacher.getNickname(),
                teacher.isAdmin(),
                teacher.getCreatedAt());
    }

    private String normalizeLoginId(String value) {
        return normalizeRequired(value, "아이디").toLowerCase();
    }

    private String normalizeRequired(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "는 필수입니다.");
        }
        return value.trim();
    }
}
