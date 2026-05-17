package main

import (
	"api-gateway/config"
	"api-gateway/middleware"
	"api-gateway/proxy"
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

	r := chi.NewRouter()

	r.Use(middleware.CORS)
	r.Use(middleware.Logger)
	r.Use(middleware.JWTAuth(cfg.JWTSecret))

	proxy.MountProxy(r, "/api/auth", authProxy)
	proxy.MountProxy(r, "/api/blogs", blogProxy)
	proxy.MountProxy(r, "/api/stakeholders", stakeholdersProxy)
	proxy.MountProxy(r, "/api/followers", followersProxy)
	proxy.MountProxy(r, "/api/tours", tourProxy)
	proxy.MountProxy(r, "/api/reviews", tourProxy)

	log.Printf("API Gateway running on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}