package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                     string
	AuthServiceURL           string
	BlogServiceURL           string
	StakeholdersServiceURL   string
	FollowersServiceURL      string
	FollowersServiceGRPCHost string
	FollowersServiceGRPCPort int
	TourServiceURL           string
	JWTSecret                string
}

func LoadConfig() *Config {
	return &Config{
		Port:                     getEnv("GATEWAY_PORT", "8000"),
		StakeholdersServiceURL:   getEnv("STAKEHOLDERS_SERVICE_URL", "http://localhost:8080"),
		AuthServiceURL:           getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		BlogServiceURL:           getEnv("BLOG_SERVICE_URL", "http://localhost:8082"),
		FollowersServiceURL:      getEnv("FOLLOWERS_SERVICE_URL", "http://localhost:8083"),
		FollowersServiceGRPCHost: getEnv("FOLLOWERS_SERVICE_GRPC_HOST", "localhost"),
		FollowersServiceGRPCPort: getEnvInt("FOLLOWERS_SERVICE_GRPC_PORT", 9091),
		TourServiceURL:           getEnv("TOUR_SERVICE_URL", "http://localhost:8084"),
		JWTSecret:                getEnv("JWT_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}
