package com.soa.purchaseService.services;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.soa.purchaseService.dtos.ExecutionRecordResponse;
import com.soa.purchaseService.dtos.RecordExecutionCompleteRequest;
import com.soa.purchaseService.dtos.RecordExecutionStartRequest;
import com.soa.purchaseService.models.TourExecutionRecord;
import com.soa.purchaseService.models.TourExecutionRecord.Status;
import com.soa.purchaseService.repositories.TourExecutionRecordRepository;
import com.soa.purchaseService.repositories.TourPurchaseTokenRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExecutionRecordService {

    private final TourExecutionRecordRepository recordRepository;
    private final TourPurchaseTokenRepository tokenRepository;

    public ExecutionRecordResponse recordStart(RecordExecutionStartRequest request) {
        if (!tokenRepository.existsByTouristIdAndTourId(request.getTouristId(), request.getTourId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tour not purchased");
        }
        if (recordRepository.findBySagaId(request.getSagaId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Execution record already exists for saga");
        }

        Instant now = Instant.now();
        TourExecutionRecord record = new TourExecutionRecord(
                null,
                request.getSagaId(),
                request.getExecutionId(),
                request.getTouristId(),
                request.getTourId(),
                Status.STARTED,
                now,
                null);
        TourExecutionRecord saved = recordRepository.save(record);
        return toResponse(saved);
    }

    public void deleteBySagaId(String sagaId) {
        recordRepository.deleteBySagaId(sagaId);
    }

    public ExecutionRecordResponse recordComplete(RecordExecutionCompleteRequest request) {
        TourExecutionRecord record = recordRepository
                .findByExecutionIdAndTouristIdAndStatus(
                        request.getExecutionId(), request.getTouristId(), Status.STARTED)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Started execution record not found"));

        record.setStatus(Status.COMPLETED);
        record.setCompletedAt(Instant.now());
        TourExecutionRecord saved = recordRepository.save(record);
        return toResponse(saved);
    }

    public ExecutionRecordResponse revertComplete(RecordExecutionCompleteRequest request) {
        TourExecutionRecord record = recordRepository
                .findByExecutionIdAndTouristIdAndStatus(
                        request.getExecutionId(), request.getTouristId(), Status.COMPLETED)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Completed execution record not found"));

        record.setStatus(Status.STARTED);
        record.setCompletedAt(null);
        TourExecutionRecord saved = recordRepository.save(record);
        return toResponse(saved);
    }

    public boolean hasCompletedExecution(String touristId, String tourId) {
        return recordRepository.existsByTouristIdAndTourIdAndStatus(
                touristId, tourId, Status.COMPLETED);
    }

    private ExecutionRecordResponse toResponse(TourExecutionRecord record) {
        return new ExecutionRecordResponse(
                record.getId(),
                record.getSagaId(),
                record.getExecutionId(),
                record.getTouristId(),
                record.getTourId(),
                record.getStatus().name());
    }
}
