package com.teachercabinet.server.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachercabinet.server.entity.Teacher;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    List<Teacher> findAllByOrderByTeacherIdDesc();

    boolean existsByNickname(String nickname);

    boolean existsByLoginId(String loginId);

    Optional<Teacher> findByLoginId(String loginId);
}
