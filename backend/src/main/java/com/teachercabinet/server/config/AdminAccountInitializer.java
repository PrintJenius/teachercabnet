package com.teachercabinet.server.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.teachercabinet.server.entity.Teacher;
import com.teachercabinet.server.repository.TeacherRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminAccountInitializer {

    private final TeacherRepository teacherRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.bootstrap-login-id:}")
    private String bootstrapLoginId;

    @Value("${app.admin.bootstrap-password:}")
    private String bootstrapPassword;

    @Value("${app.admin.bootstrap-nickname:관리자}")
    private String bootstrapNickname;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureDefaultAdmin() {
        String loginId = bootstrapLoginId == null ? "" : bootstrapLoginId.trim().toLowerCase();
        String password = bootstrapPassword == null ? "" : bootstrapPassword.trim();
        String nickname = bootstrapNickname == null ? "" : bootstrapNickname.trim();

        if (loginId.isEmpty() || password.isEmpty()) {
            log.debug("기본 관리자 자동 생성을 건너뜁니다. ADMIN_BOOTSTRAP_LOGIN_ID, ADMIN_BOOTSTRAP_PASSWORD를 설정하세요.");
            return;
        }
        if (nickname.isEmpty()) {
            log.warn("ADMIN_BOOTSTRAP_NICKNAME이 비어 있어 기본 관리자 자동 생성을 건너뜁니다.");
            return;
        }
        if (teacherRepository.existsByLoginId(loginId)) {
            return;
        }
        teacherRepository.save(Teacher.builder()
                .loginId(loginId)
                .password(passwordEncoder.encode(password))
                .nickname(nickname)
                .isAdmin(true)
                .build());
        log.info("기본 관리자 계정을 생성했습니다. loginId={}", loginId);
    }
}
