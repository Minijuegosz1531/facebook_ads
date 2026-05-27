package application

import (
	"context"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

// Enqueuer schedules an inspiration job to run later, decoupling "accept the
// request" from "do the heavy work".
//
// # Why an interface here
//
// This is the seam between the API and the worker. Two implementations satisfy
// it (both in internal/adapter/outbound/queue):
//
//   - InProcess — runs the job in a goroutine in the same process (dev/stub,
//     no Redis). The Go equivalent of FastAPI BackgroundTasks.
//   - Asynq — serializes the command and pushes it to Redis; a separate
//     `cmd/worker` process consumes it. The Go equivalent of Python's arq:
//     enqueue here, run there.
//
// The HTTP handler depends only on this interface, so switching from a
// goroutine to a real distributed queue is a one-line change in the container —
// no handler or use-case code changes.
type Enqueuer interface {
	EnqueueInspiration(ctx context.Context, cmd usecase.GenerateInspirationCommand) error
}
