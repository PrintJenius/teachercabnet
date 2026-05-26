package com.teachercabinet.server.service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.teachercabinet.server.entity.Teacher;
import com.teachercabinet.server.repository.TeacherRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminAccessService {

    private final TeacherRepository teacherRepository;

    @Value("${app.admin.login-ids:admin}")
    private String adminLoginIds;

    public boolean isAdmin(Long teacherId) {
        if (teacherId == null) {
            return false;
        }
        Teacher teacher = teacherRepository.findById(teacherId).orElse(null);
        if (teacher == null) {
            return false;
        }
        if (teacher.isAdmin()) {
            return true;
        }
        String loginId = teacher.getLoginId();
        if (loginId == null || loginId.isBlank()) {
            return false;
        }
        return configuredAdminLoginIds().contains(loginId.trim().toLowerCase(Locale.ROOT));
    }

    public void requireAdmin(Long teacherId) {
        if (!isAdmin(teacherId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
    }

    private Set<String> configuredAdminLoginIds() {
        if (adminLoginIds == null || adminLoginIds.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(adminLoginIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }
}
