// Package queue holds outbound adapters that schedule background work: an
// in-process goroutine runner and an asynq (Redis) enqueuer. Both satisfy
// application.Enqueuer.
package queue

import (
	"context"
	"log/slog"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/application"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

// InProcess runs jobs in a goroutine inside the API process. No Redis, no extra
// process — the default for dev and tests. The trade-off: a job in flight is
// lost if the process dies, and it can't scale across containers.
type InProcess struct {
	svc *application.InspirationService
}

// NewInProcess wires the runner to the inspiration service.
func NewInProcess(svc *application.InspirationService) *InProcess {
	return &InProcess{svc: svc}
}

// EnqueueInspiration launches the pipeline in a goroutine and returns at once.
// It uses context.Background() (not the request context) so the work is not
// cancelled when the HTTP handler returns its 202.
func (q *InProcess) EnqueueInspiration(_ context.Context, cmd usecase.GenerateInspirationCommand) error {
	go func() {
		if _, err := q.svc.RunCommand(context.Background(), cmd); err != nil {
			slog.Error("inprocess inspiration job failed", "job_id", cmd.JobID, "err", err)
		}
	}()
	return nil
}
