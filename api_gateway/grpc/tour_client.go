package grpc

import (
	"api-gateway/grpc/tour"
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

type TourClient struct {
	conn             *grpc.ClientConn
	client           tour.TourQueryServiceClient
	executionClient  tour.TourExecutionServiceClient
}

type TourDurationResponse struct {
	TransportType string `json:"transport_type"`
	Minutes       int32  `json:"minutes"`
}

type KeypointResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	ImageURL    string  `json:"image_url"`
}

type TourPublicResponse struct {
	ID            string                 `json:"id"`
	AuthorID      string                 `json:"author_id"`
	Title         string                 `json:"title"`
	Description   string                 `json:"description"`
	Difficulty    string                 `json:"difficulty"`
	Tags          []string               `json:"tags"`
	Status        string                 `json:"status"`
	Price         float64                `json:"price"`
	DistanceKM    float64                `json:"distance_km"`
	Durations     []TourDurationResponse `json:"durations"`
	FirstKeypoint *KeypointResponse      `json:"first_keypoint"`
	PublishedAt   *string                `json:"published_at"`
}

type TourFullResponse struct {
	ID          string                 `json:"id"`
	AuthorID    string                 `json:"author_id"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Difficulty  string                 `json:"difficulty"`
	Tags        []string               `json:"tags"`
	Status      string                 `json:"status"`
	Price       float64                `json:"price"`
	DistanceKM  float64                `json:"distance_km"`
	Durations   []TourDurationResponse `json:"durations"`
	Keypoints   []KeypointResponse     `json:"keypoints"`
	PublishedAt *string                `json:"published_at"`
	ArchivedAt  *string                `json:"archived_at"`
	CreatedAt   string                 `json:"created_at"`
	UpdatedAt   string                 `json:"updated_at"`
}

var tourClient *TourClient
var tourClientOnce sync.Once

func NewTourClient(host string, port int) *TourClient {
	tourClientOnce.Do(func() {
		target := fmt.Sprintf("%s:%d", host, port)
		conn, err := grpc.NewClient(target, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			log.Fatalf("Failed to connect to tour gRPC server at %s: %v", target, err)
		}
		tourClient = &TourClient{
			conn:            conn,
			client:          tour.NewTourQueryServiceClient(conn),
			executionClient: tour.NewTourExecutionServiceClient(conn),
		}
		log.Printf("Tour gRPC client connected to %s", target)
	})
	return tourClient
}

func (c *TourClient) GetPublishedTours(userID string, roles []string) ([]TourPublicResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	response, err := c.client.GetPublishedTours(ctx, &tour.GetPublishedToursRequest{
		UserId: userID,
		Roles:  roles,
	})
	if err != nil {
		return nil, mapTourError(err)
	}

	tours := make([]TourPublicResponse, 0, len(response.GetTours()))
	for _, item := range response.GetTours() {
		tours = append(tours, publicTourFromProto(item))
	}
	return tours, nil
}

func (c *TourClient) GetTourByID(tourID, userID string, roles []string) (interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	response, err := c.client.GetTourById(ctx, &tour.GetTourByIdRequest{
		TourId: tourID,
		UserId: userID,
		Roles:  roles,
	})
	if err != nil {
		return nil, mapTourError(err)
	}

	if response.GetPublicView() {
		return publicTourFromProto(response.GetPublicTour()), nil
	}
	return fullTourFromProto(response.GetFullTour()), nil
}

type VisitedKeypointResponse struct {
	KeypointID string `json:"keypoint_id"`
	VisitedAt  string `json:"visited_at"`
}

type TourExecutionResponse struct {
	ID                string                    `json:"id"`
	TourID            string                    `json:"tour_id"`
	TouristID         string                    `json:"tourist_id"`
	Status            string                    `json:"status"`
	StartedAt         string                    `json:"started_at"`
	CompletedAt       *string                   `json:"completed_at"`
	AbandonedAt       *string                   `json:"abandoned_at"`
	LastActivityAt    string                    `json:"last_activity_at"`
	StartLatitude     float64                   `json:"start_latitude"`
	StartLongitude    float64                   `json:"start_longitude"`
	VisitedKeypoints  []VisitedKeypointResponse `json:"visited_keypoints"`
	SagaID            *string                   `json:"saga_id"`
}

func (c *TourClient) StartExecution(tourID, userID string, latitude, longitude float64) (*TourExecutionResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	response, err := c.executionClient.StartExecution(ctx, &tour.StartExecutionRequest{
		TourId:    tourID,
		TouristId: userID,
		Latitude:  latitude,
		Longitude: longitude,
	})
	if err != nil {
		return nil, mapTourError(err)
	}
	return executionFromProto(response), nil
}

func (c *TourClient) GetActiveExecution(userID string) (*TourExecutionResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	response, err := c.executionClient.GetActiveExecution(ctx, &tour.GetActiveExecutionRequest{
		TouristId: userID,
	})
	if err != nil {
		return nil, mapTourError(err)
	}
	return executionFromProto(response), nil
}

func executionFromProto(item *tour.TourExecutionMessage) *TourExecutionResponse {
	if item == nil {
		return nil
	}
	visited := make([]VisitedKeypointResponse, 0, len(item.GetVisitedKeypoints()))
	for _, v := range item.GetVisitedKeypoints() {
		visited = append(visited, VisitedKeypointResponse{
			KeypointID: v.GetKeypointId(),
			VisitedAt:  v.GetVisitedAt(),
		})
	}
	resp := &TourExecutionResponse{
		ID:               item.GetId(),
		TourID:           item.GetTourId(),
		TouristID:        item.GetTouristId(),
		Status:           item.GetStatus(),
		StartedAt:        item.GetStartedAt(),
		LastActivityAt:   item.GetLastActivityAt(),
		StartLatitude:    item.GetStartLatitude(),
		StartLongitude:   item.GetStartLongitude(),
		VisitedKeypoints: visited,
	}
	if item.CompletedAt != nil {
		resp.CompletedAt = item.CompletedAt
	}
	if item.AbandonedAt != nil {
		resp.AbandonedAt = item.AbandonedAt
	}
	if item.SagaId != nil {
		resp.SagaID = item.SagaId
	}
	return resp
}

func (c *TourClient) Close() {
	if c.conn != nil {
		c.conn.Close()
	}
}

type TourError struct {
	Code    int
	Message string
}

func (e *TourError) Error() string {
	return e.Message
}

func mapTourError(err error) error {
	st, ok := status.FromError(err)
	if !ok {
		return fmt.Errorf("gRPC call failed: %w", err)
	}

	switch st.Code() {
	case codes.InvalidArgument:
		return &TourError{Code: 400, Message: st.Message()}
	case codes.Unauthenticated:
		return &TourError{Code: 401, Message: st.Message()}
	case codes.PermissionDenied:
		return &TourError{Code: 403, Message: st.Message()}
	case codes.NotFound:
		return &TourError{Code: 404, Message: st.Message()}
	case codes.AlreadyExists:
		return &TourError{Code: 409, Message: st.Message()}
	case codes.Unavailable, codes.DeadlineExceeded:
		return &TourError{Code: 503, Message: "Tour service unavailable"}
	default:
		return &TourError{Code: 500, Message: "Internal server error"}
	}
}

func publicTourFromProto(item *tour.TourPublic) TourPublicResponse {
	if item == nil {
		return TourPublicResponse{
			Tags:      []string{},
			Durations: []TourDurationResponse{},
		}
	}
	return TourPublicResponse{
		ID:            item.GetId(),
		AuthorID:      item.GetAuthorId(),
		Title:         item.GetTitle(),
		Description:   item.GetDescription(),
		Difficulty:    item.GetDifficulty(),
		Tags:          append([]string{}, item.GetTags()...),
		Status:        item.GetStatus(),
		Price:         item.GetPrice(),
		DistanceKM:    item.GetDistanceKm(),
		Durations:     durationsFromProto(item.GetDurations()),
		FirstKeypoint: keypointFromProto(item.GetFirstKeypoint()),
		PublishedAt:   item.PublishedAt,
	}
}

func fullTourFromProto(item *tour.TourFull) TourFullResponse {
	if item == nil {
		return TourFullResponse{
			Tags:      []string{},
			Durations: []TourDurationResponse{},
			Keypoints: []KeypointResponse{},
		}
	}
	return TourFullResponse{
		ID:          item.GetId(),
		AuthorID:    item.GetAuthorId(),
		Title:       item.GetTitle(),
		Description: item.GetDescription(),
		Difficulty:  item.GetDifficulty(),
		Tags:        append([]string{}, item.GetTags()...),
		Status:      item.GetStatus(),
		Price:       item.GetPrice(),
		DistanceKM:  item.GetDistanceKm(),
		Durations:   durationsFromProto(item.GetDurations()),
		Keypoints:   keypointsFromProto(item.GetKeypoints()),
		PublishedAt: item.PublishedAt,
		ArchivedAt:  item.ArchivedAt,
		CreatedAt:   item.GetCreatedAt(),
		UpdatedAt:   item.GetUpdatedAt(),
	}
}

func durationsFromProto(items []*tour.TourDuration) []TourDurationResponse {
	durations := make([]TourDurationResponse, 0, len(items))
	for _, item := range items {
		durations = append(durations, TourDurationResponse{
			TransportType: item.GetTransportType(),
			Minutes:       item.GetMinutes(),
		})
	}
	return durations
}

func keypointsFromProto(items []*tour.Keypoint) []KeypointResponse {
	keypoints := make([]KeypointResponse, 0, len(items))
	for _, item := range items {
		if keypoint := keypointFromProto(item); keypoint != nil {
			keypoints = append(keypoints, *keypoint)
		}
	}
	return keypoints
}

func keypointFromProto(item *tour.Keypoint) *KeypointResponse {
	if item == nil {
		return nil
	}
	return &KeypointResponse{
		ID:          item.GetId(),
		Name:        item.GetName(),
		Description: item.GetDescription(),
		Latitude:    item.GetLatitude(),
		Longitude:   item.GetLongitude(),
		ImageURL:    item.GetImageUrl(),
	}
}
