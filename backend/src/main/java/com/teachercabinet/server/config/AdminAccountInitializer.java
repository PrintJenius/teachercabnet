package com.teachercabinet.server.config;

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

    private static final String DEFAULT_LOGIN_ID = "admin";
    private static final String DEFAULT_PASSWORD = "admin1234";
    private static final String DEFAULT_NICKNAME = "관리자";

    private final TeacherRepository teacherRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureDefaultAdmin() {
        if (teacherRepository.existsByLoginId(DEFAULT_LOGIN_ID)) {
            return;
        }
        teacherRepository.save(Teacher.builder()
                .loginId(DEFAULT_LOGIN_ID)
                .password(passwordEncoder.encode(DEFAULT_PASSWORD))
                .nickname(DEFAULT_NICKNAME)
                .isAdmin(true)
                .build());
        log.info("기본 관리자 계정을 생성했습니다. loginId={}", DEFAULT_LOGIN_ID);
    }
}
