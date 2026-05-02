package main

import (
	"api-gateway/config"
	"api-gateway/middleware"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

func makeProxy(target string) http.Handler {
	url, _ := url.Parse(target)
	return httputil.NewSingleHostReverseProxy(url)
}

func main() {
	cfg := config.LoadConfig()

	authProxy := makeProxy(cfg.AuthServiceURL)
	blogProxy := makeProxy(cfg.BlogServiceURL)
	stakeholdersProxy := makeProxy(cfg.StakeholdersServiceURL)

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		switch {
		case strings.HasPrefix(path, "/api/auth"):
			log.Printf("→ AUTH: %s %s", r.Method, path)
			authProxy.ServeHTTP(w, r)

		case strings.HasPrefix(path, "/api/blogs"):
			log.Printf("→ BLOG: %s %s", r.Method, path)
			blogProxy.ServeHTTP(w, r)

		case strings.HasPrefix(path, "/api/stakeholders"):
			log.Printf("→ STAKEHOLDERS: %s %s", r.Method, path)
			stakeholdersProxy.ServeHTTP(w, r)

		default:
			http.Error(w, "route not found", http.StatusNotFound)
		}
	})

	// Middleware stack
	handler := middleware.JWTAuth(cfg.JWTSecret)(mux)

	log.Printf("API Gateway running on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, handler))
}
