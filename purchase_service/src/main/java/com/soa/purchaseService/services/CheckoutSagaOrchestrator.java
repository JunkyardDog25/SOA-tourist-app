package com.soa.purchaseService.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import com.soa.purchaseService.dtos.CheckoutResult;
import com.soa.purchaseService.dtos.RecordPurchasesRequest;
import com.soa.purchaseService.dtos.RecordPurchasesResponse;
import com.soa.purchaseService.dtos.TokenResponse;
import com.soa.purchaseService.dtos.TourValidationRequest;
import com.soa.purchaseService.dtos.TourValidationResponse;
import com.soa.purchaseService.dtos.TourValidationResult;
import com.soa.purchaseService.exceptions.InvalidCartItemsException;
import com.soa.purchaseService.exceptions.SagaExecutionException;
import com.soa.purchaseService.models.SagaLog;
import com.soa.purchaseService.models.ShoppingCart;
import com.soa.purchaseService.models.TourPurchaseToken;
import com.soa.purchaseService.repositories.SagaLogRepository;
import com.soa.purchaseService.repositories.ShoppingCartRepository;
import com.soa.purchaseService.repositories.TourPurchaseTokenRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CheckoutSagaOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(CheckoutSagaOrchestrator.class);

    private static final String STEP_VALIDATE    = "PRE_FLIGHT_VALIDATE";
    private static final String STEP_1           = "STEP_1_RECORD_PURCHASES";
    private static final String STEP_2           = "STEP_2_CREATE_TOKENS";
    private static final String STEP_3           = "STEP_3_CLEAR_CART";
    private static final String MDC_SAGA_ID      = "sagaId";

    private final TourServiceClient tourServiceClient;
    private final TourPurchaseTokenRepository tokenRepository;
    private final ShoppingCartRepository cartRepository;
    private final SagaLogRepository sagaLogRepository;

    // -----------------------------------------------------------------------
    // Public entry point
    // -----------------------------------------------------------------------

    public CheckoutResult execute(String touristId, ShoppingCart cart) {
        String sagaId = UUID.randomUUID().toString();
        MDC.put(MDC_SAGA_ID, sagaId);
        try {
            return doExecute(sagaId, touristId, cart);
        } finally {
            MDC.remove(MDC_SAGA_ID);
        }
    }

    // -----------------------------------------------------------------------
    // Orchestration flow
    // -----------------------------------------------------------------------

    private CheckoutResult doExecute(String sagaId, String touristId, ShoppingCart cart) {
        SagaLog sagaLog = initSagaLog(sagaId, touristId);

        // --- Pre-flight validation (not a SAGA step; no compensation) -------
        log.info("[{}] Pre-flight: validating {} cart item(s)", sagaId, cart.getItems().size());
        TourValidationResponse validationResponse = preFlight(sagaId, sagaLog, cart);
        List<TourValidationResult> invalid = validationResponse.getResults().stream()
                .filter(r -> !r.isValid())
                .collect(Collectors.toList());
        if (!invalid.isEmpty()) {
            markFailed(sagaLog, STEP_VALIDATE, "Cart contains invalid items");
            log.warn("[{}] Pre-flight failed: {} invalid item(s)", sagaId, invalid.size());
            throw new InvalidCartItemsException(invalid);
        }
        log.info("[{}] Pre-flight passed", sagaId);

        // --- Step 1: RecordPurchases -----------------------------------------
        RecordPurchasesResponse recordResponse = step1RecordPurchases(sagaId, sagaLog, touristId, cart);
        appendStep(sagaLog, STEP_1);

        // --- Step 2: CreateTokens -------------------------------------------
        List<TourPurchaseToken> tokens = step2CreateTokens(sagaId, sagaLog, touristId, cart, recordResponse);
        appendStep(sagaLog, STEP_2);

        // --- Step 3: ClearCart (last step — no compensation) ----------------
        step3ClearCart(sagaId, sagaLog, touristId, tokens);
        appendStep(sagaLog, STEP_3);

        // --- Complete -------------------------------------------------------
        sagaLog.setStatus(SagaLog.Status.COMPLETED);
        sagaLog.setUpdatedAt(Instant.now());
        sagaLogRepository.save(sagaLog);
        log.info("[{}] SAGA COMPLETED", sagaId);

        List<TokenResponse> tokenResponses = tokens.stream()
                .map(t -> new TokenResponse(
                        t.getId(), t.getTouristId(), t.getTourId(),
                        t.getTourName(), t.getPrice(), t.getPurchasedAt()))
                .collect(Collectors.toList());

        return CheckoutResult.builder()
                .sagaId(sagaId)
                .tokens(tokenResponses)
                .build();
    }

    // -----------------------------------------------------------------------
    // Step implementations
    // -----------------------------------------------------------------------

    private TourValidationResponse preFlight(String sagaId, SagaLog sagaLog, ShoppingCart cart) {
        List<TourValidationRequest.TourValidationItem> items = cart.getItems().stream()
                .map(i -> TourValidationRequest.TourValidationItem.builder()
                        .tourId(i.getTourId())
                        .price(i.getPrice())
                        .build())
                .collect(Collectors.toList());

        TourValidationRequest request = TourValidationRequest.builder().items(items).build();
        try {
            return tourServiceClient.validateBatch(request);
        } catch (Exception e) {
            markFailed(sagaLog, STEP_VALIDATE, e.getMessage());
            throw new SagaExecutionException(sagaId, "Pre-flight validation failed: " + e.getMessage(), e);
        }
    }

    private RecordPurchasesResponse step1RecordPurchases(String sagaId, SagaLog sagaLog,
                                                          String touristId, ShoppingCart cart) {
        log.info("[{}] Step 1: recordPurchases", sagaId);
        List<RecordPurchasesRequest.PurchaseItem> purchaseItems = cart.getItems().stream()
                .map(i -> RecordPurchasesRequest.PurchaseItem.builder()
                        .tourId(i.getTourId())
                        .price(i.getPrice())
                        .build())
                .collect(Collectors.toList());

        RecordPurchasesRequest request = RecordPurchasesRequest.builder()
                .sagaId(sagaId)
                .touristId(touristId)
                .items(purchaseItems)
                .build();
        try {
            return tourServiceClient.recordPurchases(request);
        } catch (Exception e) {
            markFailed(sagaLog, STEP_1, e.getMessage());
            throw new SagaExecutionException(sagaId, "Step 1 failed: " + e.getMessage(), e);
        }
    }

    private List<TourPurchaseToken> step2CreateTokens(String sagaId, SagaLog sagaLog,
                                                       String touristId, ShoppingCart cart,
                                                       RecordPurchasesResponse recordResponse) {
        log.info("[{}] Step 2: createTokens", sagaId);
        Instant now = Instant.now();
        List<TourPurchaseToken> saved = new ArrayList<>();
        try {
            for (var item : cart.getItems()) {
                TourPurchaseToken token = new TourPurchaseToken(
                        null, touristId, item.getTourId(), item.getTourName(),
                        item.getPrice(), now, sagaId);
                saved.add(tokenRepository.save(token));
            }
            return saved;
        } catch (Exception e) {
            log.warn("[{}] Step 2 failed — starting compensation", sagaId);
            sagaLog.setStatus(SagaLog.Status.COMPENSATING);
            sagaLog.setUpdatedAt(Instant.now());
            sagaLogRepository.save(sagaLog);

            compensateStep2(sagaId, sagaLog);
            compensateStep1(sagaId, sagaLog);

            markFailed(sagaLog, STEP_2, e.getMessage());
            throw new SagaExecutionException(sagaId, "Step 2 failed: " + e.getMessage(), e);
        }
    }

    private void step3ClearCart(String sagaId, SagaLog sagaLog,
                                 String touristId, List<TourPurchaseToken> tokens) {
        log.info("[{}] Step 3: clearCart", sagaId);
        try {
            cartRepository.clearCart(touristId);
        } catch (Exception e) {
            log.warn("[{}] Step 3 failed — starting compensation", sagaId);
            sagaLog.setStatus(SagaLog.Status.COMPENSATING);
            sagaLog.setUpdatedAt(Instant.now());
            sagaLogRepository.save(sagaLog);

            compensateStep2(sagaId, sagaLog);
            compensateStep1(sagaId, sagaLog);

            markFailed(sagaLog, STEP_3, e.getMessage());
            throw new SagaExecutionException(sagaId, "Step 3 failed: " + e.getMessage(), e);
        }
    }

    // -----------------------------------------------------------------------
    // Compensations (best-effort: log and continue; never throw)
    // -----------------------------------------------------------------------

    private void compensateStep2(String sagaId, SagaLog sagaLog) {
        log.warn("[{}] Compensating Step 2: deleting tokens with sagaId={}", sagaId, sagaId);
        try {
            tokenRepository.deleteBySagaId(sagaId);
            log.info("[{}] Compensation Step 2 completed", sagaId);
        } catch (Exception e) {
            log.error("[{}] Compensation Step 2 FAILED — could not delete tokens: {}", sagaId, e.getMessage());
            sagaLog.setCompensationIncomplete(true);
        }
    }

    private void compensateStep1(String sagaId, SagaLog sagaLog) {
        log.warn("[{}] Compensating Step 1: deleting purchase records for sagaId={}", sagaId, sagaId);
        try {
            tourServiceClient.deletePurchaseRecords(sagaId);
            log.info("[{}] Compensation Step 1 completed", sagaId);
        } catch (Exception e) {
            log.error("[{}] Compensation Step 1 FAILED — could not delete purchase records: {}", sagaId, e.getMessage());
            sagaLog.setCompensationIncomplete(true);
        }
    }

    // -----------------------------------------------------------------------
    // SagaLog helpers
    // -----------------------------------------------------------------------

    private SagaLog initSagaLog(String sagaId, String touristId) {
        SagaLog log = new SagaLog();
        log.setSagaId(sagaId);
        log.setTouristId(touristId);
        log.setStatus(SagaLog.Status.STARTED);
        log.setCompensationIncomplete(false);
        Instant now = Instant.now();
        log.setCreatedAt(now);
        log.setUpdatedAt(now);
        return sagaLogRepository.save(log);
    }

    private void appendStep(SagaLog sagaLog, String step) {
        sagaLog.getCompletedSteps().add(step);
        sagaLog.setUpdatedAt(Instant.now());
        sagaLogRepository.save(sagaLog);
    }

    private void markFailed(SagaLog sagaLog, String failedStep, String errorMessage) {
        sagaLog.setStatus(SagaLog.Status.FAILED);
        sagaLog.setFailedStep(failedStep);
        sagaLog.setErrorMessage(errorMessage);
        sagaLog.setUpdatedAt(Instant.now());
        sagaLogRepository.save(sagaLog);
    }
}
