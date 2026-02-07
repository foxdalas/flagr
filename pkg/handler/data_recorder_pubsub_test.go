package handler

import (
	"context"
	"encoding/json"
	"testing"

	"cloud.google.com/go/pubsub/v2"
	pb "cloud.google.com/go/pubsub/v2/apiv1/pubsubpb"
	"cloud.google.com/go/pubsub/v2/pstest"
	"github.com/foxdalas/flagr/swagger_gen/models"
	"github.com/prashantv/gostub"
	"github.com/stretchr/testify/assert"
	"google.golang.org/api/option"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const testProject = "project"

func TestNewPubsubRecorder(t *testing.T) {
	t.Run("creates recorder", func(t *testing.T) {
		client, srv := mockClient(t)
		defer srv.Close()
		defer client.Close()

		createTopic(t, srv, "test")

		defer gostub.StubFunc(
			&pubsubClient,
			client,
			nil,
		).Reset()

		recorder := NewPubsubRecorder()
		assert.NotNil(t, recorder)
	})
}

func TestPubsubAsyncRecord(t *testing.T) {
	t.Run("publishes message", func(t *testing.T) {
		client, srv := mockClient(t)
		defer srv.Close()
		defer client.Close()

		createTopic(t, srv, "test")

		publisher := client.Publisher("test")
		pr := &pubsubRecorder{
			producer:  client,
			publisher: publisher,
		}

		pr.AsyncRecord(
			models.EvalResult{
				EvalContext: &models.EvalContext{
					EntityID: "d08042018",
				},
				FlagID:         1,
				FlagSnapshotID: 1,
				SegmentID:      1,
				VariantID:      1,
				VariantKey:     "control",
			},
		)

		publisher.Stop()

		msgs := srv.Messages()
		assert.Len(t, msgs, 1)

		var frame struct {
			Payload   string `json:"payload"`
			Encrypted bool   `json:"encrypted"`
		}
		err := json.Unmarshal(msgs[0].Data, &frame)
		assert.NoError(t, err)
		assert.False(t, frame.Encrypted)

		var evalResult map[string]interface{}
		err = json.Unmarshal([]byte(frame.Payload), &evalResult)
		assert.NoError(t, err)

		evalCtx, ok := evalResult["evalContext"].(map[string]interface{})
		assert.True(t, ok)
		assert.Equal(t, "d08042018", evalCtx["entityID"])
	})
}

func TestPubsubClose(t *testing.T) {
	t.Run("closes without error", func(t *testing.T) {
		client, srv := mockClient(t)
		defer srv.Close()

		createTopic(t, srv, "test")

		pr := &pubsubRecorder{
			producer:  client,
			publisher: client.Publisher("test"),
		}

		err := pr.Close()
		assert.NoError(t, err)
	})
}

func mockClient(t *testing.T) (*pubsub.Client, *pstest.Server) {
	t.Helper()
	ctx := context.Background()
	srv := pstest.NewServer()
	client, err := pubsub.NewClient(ctx, testProject,
		option.WithEndpoint(srv.Addr),
		option.WithoutAuthentication(),
		option.WithGRPCDialOption(grpc.WithTransportCredentials(insecure.NewCredentials())),
	)
	if err != nil {
		t.Fatal("failed creating mock client", err)
	}

	return client, srv
}

func createTopic(t *testing.T, srv *pstest.Server, name string) {
	t.Helper()
	fullName := "projects/" + testProject + "/topics/" + name
	_, err := srv.GServer.CreateTopic(context.Background(), &pb.Topic{Name: fullName})
	if err != nil {
		t.Fatal("failed creating topic", err)
	}
}
