package com.teachercabinet.server.controller;



import java.time.LocalDate;

import java.util.List;



import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.PutMapping;

import org.springframework.web.bind.annotation.RequestBody;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.bind.annotation.RestController;



import com.teachercabinet.server.dto.StudentJournalItemResponse;

import com.teachercabinet.server.dto.StudentJournalUpsertRequest;

import com.teachercabinet.server.security.JwtPrincipal;

import com.teachercabinet.server.service.StudentJournalService;



import lombok.RequiredArgsConstructor;



@RestController

@RequestMapping("/api/journals")

@RequiredArgsConstructor

public class StudentJournalController {

    private final StudentJournalService studentJournalService;



    @GetMapping

    public List<StudentJournalItemResponse> getJournals(

            @AuthenticationPrincipal JwtPrincipal principal,

            @RequestParam("date") LocalDate date) {

        return studentJournalService.getJournals(principal.teacherId(), date);

    }



    @GetMapping("/view")

    public List<StudentJournalItemResponse> getJournalsForView(

            @AuthenticationPrincipal JwtPrincipal principal,

            @RequestParam("date") LocalDate date) {

        return studentJournalService.getJournalsForView(principal.teacherId(), date);

    }



    @PutMapping

    public StudentJournalItemResponse upsertJournal(

            @AuthenticationPrincipal JwtPrincipal principal,

            @RequestBody StudentJournalUpsertRequest request) {

        return studentJournalService.upsertJournal(principal.teacherId(), request);

    }

}

