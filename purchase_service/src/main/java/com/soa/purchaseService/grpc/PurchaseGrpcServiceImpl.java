package com.soa.purchaseService.grpc;

import java.util.HashMap;
import java.util.Map;

import com.soa.purchaseService.repositories.TourPurchaseTokenRepository;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class PurchaseGrpcServiceImpl extends PurchaseQueryServiceGrpc.PurchaseQueryServiceImplBase {

    private final TourPurchaseTokenRepository tokenRepository;

    @Override
    public void hasPurchasedTour(
            HasPurchasedTourRequest request,
            StreamObserver<HasPurchasedTourResponse> responseObserver) {
        boolean purchased = tokenRepository.existsByTouristIdAndTourId(
                request.getTouristId(), request.getTourId());
        responseObserver.onNext(
                HasPurchasedTourResponse.newBuilder().setPurchased(purchased).build());
        responseObserver.onCompleted();
    }

    @Override
    public void hasPurchasedToursBatch(
            HasPurchasedToursBatchRequest request,
            StreamObserver<HasPurchasedToursBatchResponse> responseObserver) {
        Map<String, Boolean> result = new HashMap<>();
        for (String tourId : request.getTourIdsList()) {
            result.put(
                    tourId,
                    tokenRepository.existsByTouristIdAndTourId(
                            request.getTouristId(), tourId));
        }
        responseObserver.onNext(
                HasPurchasedToursBatchResponse.newBuilder()
                        .putAllPurchasedByTourId(result)
                        .build());
        responseObserver.onCompleted();
    }
}
