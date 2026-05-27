package grpc

import (
	"api-gateway/grpc/follow"
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

type FollowersClient struct {
	conn   *grpc.ClientConn
	client follow.FollowServiceClient
	once   sync.Once
}

var followersClient *FollowersClient
var followersClientOnce sync.Once

func NewFollowersClient(host string, port int) *FollowersClient {
	followersClientOnce.Do(func() {
		target := fmt.Sprintf("%s:%d", host, port)
		conn, err := grpc.NewClient(target, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			log.Fatalf("Failed to connect to followers gRPC server at %s: %v", target, err)
		}
		followersClient = &FollowersClient{
			conn:   conn,
			client: follow.NewFollowServiceClient(conn),
		}
		log.Printf("Followers gRPC client connected to %s", target)
	})
	return followersClient
}

func (c *FollowersClient) Follow(followerId, followeeId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := c.client.Follow(ctx, &follow.FollowRequest{
		FollowerId: followerId,
		FolloweeId: followeeId,
	})
	if err != nil {
		st, ok := status.FromError(err)
		if !ok {
			return fmt.Errorf("gRPC call failed: %w", err)
		}
		switch st.Code() {
		case codes.InvalidArgument:
			return &FollowError{Code: 400, Message: st.Message()}
		case codes.AlreadyExists:
			return &FollowError{Code: 409, Message: st.Message()}
		case codes.NotFound:
			return &FollowError{Code: 404, Message: st.Message()}
		default:
			return &FollowError{Code: 500, Message: "Internal server error"}
		}
	}
	return nil
}

func (c *FollowersClient) Close() {
	if c.conn != nil {
		c.conn.Close()
	}
}

type FollowError struct {
	Code    int
	Message string
}

func (e *FollowError) Error() string {
	return e.Message
}
