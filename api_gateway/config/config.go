package config

import "os"

type Config struct {
	Port                   string
	AuthServiceURL         string
	BlogServiceURL         string
	StakeholdersServiceURL string
	FollowersServiceURL    string
	JWTSecret              string
}

func LoadConfig() *Config {
	return &Config{
		Port:                   getEnv("GATEWAY_PORT", "8000"),
		StakeholdersServiceURL: getEnv("STAKEHOLDERS_SERVICE_URL", "http://localhost:8080"),
		AuthServiceURL:         getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		BlogServiceURL:         getEnv("BLOG_SERVICE_URL", "http://localhost:8082"),
		FollowersServiceURL:    getEnv("FOLLOWERS_SERVICE_URL", "http://localhost:8083"),
		JWTSecret:              getEnv("JWT_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
