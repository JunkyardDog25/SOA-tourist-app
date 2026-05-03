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

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.JWTAuth(cfg.JWTSecret))

	proxy.MountProxy(r, "/api/auth", authProxy)
	proxy.MountProxy(r, "/api/blogs", blogProxy)
	proxy.MountProxy(r, "/api/stakeholders", stakeholdersProxy)

	log.Printf("API Gateway running on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
