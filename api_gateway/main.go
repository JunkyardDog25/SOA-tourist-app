package main

import (
	"api-gateway/config"
	servicegrpc "api-gateway/grpc"
	"api-gateway/middleware"
	"api-gateway/proxy"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func main() {
	cfg := config.LoadConfig()

	authProxy := proxy.New(cfg.AuthServiceURL)
	blogProxy := proxy.New(cfg.BlogServiceURL)
	stakeholdersProxy := proxy.New(cfg.StakeholdersServiceURL)
	followersProxy := proxy.New(cfg.FollowersServiceURL)
	tourProxy := proxy.New(cfg.TourServiceURL)
	purchaseProxy := proxy.New(cfg.PurchaseServiceURL)

	followersGRPC := servicegrpc.NewFollowersClient(cfg.FollowersServiceGRPCHost, cfg.FollowersServiceGRPCPort)
	defer followersGRPC.Close()
	tourGRPC := servicegrpc.NewTourClient(cfg.TourServiceGRPCHost, cfg.TourServiceGRPCPort)
	defer tourGRPC.Close()

	r := chi.NewRouter()

	r.Use(middleware.CORS)
	r.Use(middleware.Logger)
	r.Use(middleware.JWTAuth(cfg.JWTSecret))

	// gRPC: POST /api/followers/follow — must be registered before the proxy mount
	r.Post("/api/followers/follow", func(w http.ResponseWriter, r *http.Request) {
		followerId, ok := middleware.UserIDFromContext(r.Context())
		if !ok || followerId == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var body struct {
			FolloweeId string `json:"followeeId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.FolloweeId == "" {
			http.Error(w, "Missing followeeId in request body", http.StatusBadRequest)
			return
		}

		if err := followersGRPC.Follow(followerId, body.FolloweeId); err != nil {
			if fe, ok := err.(*servicegrpc.FollowError); ok {
				http.Error(w, fe.Message, fe.Code)
			} else {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			}
			return
		}

		w.WriteHeader(http.StatusOK)
	})

	r.Get("/api/tours/published", func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.UserIDFromContext(r.Context())
		if !ok || userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		tours, err := tourGRPC.GetPublishedTours(userID, middleware.RolesFromContext(r.Context()))
		if err != nil {
			writeTourError(w, err)
			return
		}

		writeJSON(w, tours)
	})

	r.Get("/api/tours/my", func(w http.ResponseWriter, r *http.Request) {
		tourProxy.ServeHTTP(w, r)
	})

	r.Get("/api/tours/{tour_id}", func(w http.ResponseWriter, r *http.Request) {
		tourID := chi.URLParam(r, "tour_id")
		userID, ok := middleware.UserIDFromContext(r.Context())
		if !ok || userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		tour, err := tourGRPC.GetTourByID(tourID, userID, middleware.RolesFromContext(r.Context()))
		if err != nil {
			writeTourError(w, err)
			return
		}

		writeJSON(w, tour)
	})

	proxy.MountProxy(r, "/api/auth", authProxy)
	proxy.MountProxy(r, "/api/blogs", blogProxy)
	proxy.MountProxy(r, "/api/stakeholders", stakeholdersProxy)
	proxy.MountProxy(r, "/api/followers", followersProxy)
	proxy.MountProxy(r, "/api/tours", tourProxy)
	proxy.MountProxy(r, "/api/reviews", tourProxy)
	proxy.MountProxy(r, "/api/simulator", tourProxy)
	proxy.MountProxy(r, "/api/purchases", purchaseProxy)

	log.Printf("API Gateway running on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}

func writeJSON(w http.ResponseWriter, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

func writeTourError(w http.ResponseWriter, err error) {
	if tourErr, ok := err.(*servicegrpc.TourError); ok {
		http.Error(w, tourErr.Message, tourErr.Code)
		return
	}
	http.Error(w, "Internal server error", http.StatusInternalServerError)
}
