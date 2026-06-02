package com.teachercabinet.server.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teachercabinet.server.dto.HealthResponse;

import lombok.extern.slf4j.Slf4j;

@RestController
@Slf4j
public class WakeController {

    @GetMapping("/health")
    public HealthResponse health() {
        return ok();
    }

    @GetMapping("/wake")
    public HealthResponse wake() {
        log.info("GET /wake");
        return ok();
    }

    private static HealthResponse ok() {
        return new HealthResponse("ok");
    }
}
