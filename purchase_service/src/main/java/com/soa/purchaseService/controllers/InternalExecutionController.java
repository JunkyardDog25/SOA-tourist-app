package com.soa.purchaseService.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soa.purchaseService.dtos.ExecutionRecordResponse;
import com.soa.purchaseService.dtos.RecordExecutionCompleteRequest;
import com.soa.purchaseService.dtos.RecordExecutionStartRequest;
import com.soa.purchaseService.services.ExecutionRecordService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/internal/executions")
@RequiredArgsConstructor
public class InternalExecutionController {

    private final ExecutionRecordService executionRecordService;

    @PostMapping("/start")
    public ResponseEntity<ExecutionRecordResponse> recordStart(
            @Valid @RequestBody RecordExecutionStartRequest request) {
        return ResponseEntity.ok(executionRecordService.recordStart(request));
    }

    @DeleteMapping("/record/{sagaId}")
    public ResponseEntity<Void> deleteRecord(@PathVariable String sagaId) {
        executionRecordService.deleteBySagaId(sagaId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/complete")
    public ResponseEntity<ExecutionRecordResponse> recordComplete(
            @Valid @RequestBody RecordExecutionCompleteRequest request) {
        return ResponseEntity.ok(executionRecordService.recordComplete(request));
    }

    @PostMapping("/complete/revert")
    public ResponseEntity<ExecutionRecordResponse> revertComplete(
            @Valid @RequestBody RecordExecutionCompleteRequest request) {
        return ResponseEntity.ok(executionRecordService.revertComplete(request));
    }
}
