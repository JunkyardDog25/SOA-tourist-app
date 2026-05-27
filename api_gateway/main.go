package main

import (
	"api-gateway/config"
	followgrpc "api-gateway/grpc"
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

	followersGRPC := followgrpc.NewFollowersClient(cfg.FollowersServiceGRPCHost, cfg.FollowersServiceGRPCPort)
	defer followersGRPC.Close()

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
			if fe, ok := err.(*followgrpc.FollowError); ok {
				http.Error(w, fe.Message, fe.Code)
			} else {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			}
			return
		}

		w.WriteHeader(http.StatusOK)
	})

	proxy.MountProxy(r, "/api/auth", authProxy)
	proxy.MountProxy(r, "/api/blogs", blogProxy)
	proxy.MountProxy(r, "/api/stakeholders", stakeholdersProxy)
	proxy.MountProxy(r, "/api/followers", followersProxy)
	proxy.MountProxy(r, "/api/tours", tourProxy)
	proxy.MountProxy(r, "/api/reviews", tourProxy)
	proxy.MountProxy(r, "/api/simulator", tourProxy)

	log.Printf("API Gateway running on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
