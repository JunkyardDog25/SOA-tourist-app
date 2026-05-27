package middleware

import (
	"context"
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userId"

func UserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(UserIDKey).(string)
	return id, ok
}

var publicRoutes = []string{
	"/api/auth/register",
	"/api/auth/login",
}

func isPublicRoute(path string) bool {
	for _, route := range publicRoutes {
		if strings.HasPrefix(path, route) {
			return true
		}
	}
	return false
}

func JWTAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isPublicRoute(r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, "Missing or invalid authorization header", http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}

				keyBytes, err := base64.StdEncoding.DecodeString(jwtSecret)
				if err != nil {
					return nil, err
				}
				return keyBytes, nil
			})

			if err != nil || !token.Valid {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if userId, ok := claims["userId"].(string); ok {
					r = r.WithContext(context.WithValue(r.Context(), UserIDKey, userId))
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
