package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
)

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func makeProxy(target string) http.Handler {
	url, _ := url.Parse(target)
	return httputil.NewSingleHostReverseProxy(url)
}

func main() {
	stakeholdersURL := getEnv("STAKEHOLDERS_SERVICE_URL", "http://localhost:8080")
	authURL := getEnv("AUTH_SERVICE_URL", "http://localhost:8081")
	blogURL := getEnv("BLOG_SERVICE_URL", "http://localhost:8082")

	authProxy := makeProxy(authURL)
	blogProxy := makeProxy(blogURL)
	stakeholdersProxy := makeProxy(stakeholdersURL)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
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

	log.Println("API Gateway running on :8000")
	log.Fatal(http.ListenAndServe(":8000", nil))
}
