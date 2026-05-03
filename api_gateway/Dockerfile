FROM golang:1.26.2-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
COPY . .
RUN go build -o gateway .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/gateway .
EXPOSE 8000
CMD ["./gateway"]