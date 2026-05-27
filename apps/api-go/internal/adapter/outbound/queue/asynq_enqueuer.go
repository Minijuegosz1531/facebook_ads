package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

// TaskInspirationGenerate is the asynq task type for the inspiration pipeline.
// It is the contract between the enqueuer (here) and the worker that consumes
// it (registered in cmd/worker). The payload is the JSON of a
// GenerateInspirationCommand.
const TaskInspirationGenerate = "inspiration:generate"

// NewInspirationTask builds the asynq task for a command. Exposed so the worker
// side can stay in sync with the payload format used here.
func NewInspirationTask(cmd usecase.GenerateInspirationCommand) (*asynq.Task, error) {
	payload, err := json.Marshal(cmd)
	if err != nil {
		return nil, fmt.Errorf("marshal inspiration cmd: %w", err)
	}
	return asynq.NewTask(TaskInspirationGenerate, payload), nil
}

// AsynqEnqueuer pushes jobs onto a Redis-backed asynq queue. The matching
// worker process (cmd/worker) pulls and runs them — the multi-process model,
// like Python's arq + Redis.
type AsynqEnqueuer struct {
	client *asynq.Client
}

// NewAsynqEnqueuer connects an asynq client to Redis at redisAddr (host:port).
// The client is lazy: it dials Redis on first Enqueue, not here.
func NewAsynqEnqueuer(redisAddr string) *AsynqEnqueuer {
	return &AsynqEnqueuer{client: asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})}
}

// EnqueueInspiration serializes the command and enqueues it. asynq persists the
// task in Redis, so it survives an API restart and any worker can pick it up.
func (e *AsynqEnqueuer) EnqueueInspiration(ctx context.Context, cmd usecase.GenerateInspirationCommand) error {
	task, err := NewInspirationTask(cmd)
	if err != nil {
		return err
	}
	info, err := e.client.EnqueueContext(ctx, task, asynq.MaxRetry(3))
	if err != nil {
		return fmt.Errorf("enqueue inspiration: %w", err)
	}
	_ = info // info.ID / info.Queue available if we wanted to log it
	return nil
}

// Close releases the underlying Redis connection.
func (e *AsynqEnqueuer) Close() error { return e.client.Close() }
