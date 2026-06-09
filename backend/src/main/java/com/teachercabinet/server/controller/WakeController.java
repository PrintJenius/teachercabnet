package com.teachercabinet.server.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
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
    public HealthResponse wakeGet() {
        log.info("GET /wake");
        return ok();
    }

    @RequestMapping(value = "/wake", method = RequestMethod.HEAD)
    public ResponseEntity<Void> wakeHead() {
        log.info("HEAD /wake");
        return ResponseEntity.ok().build();
    }

    private static HealthResponse ok() {
        return new HealthResponse("ok");
    }
}
