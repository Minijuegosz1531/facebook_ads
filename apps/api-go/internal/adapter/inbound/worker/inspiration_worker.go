// Package worker is the inbound adapter for background jobs: it adapts asynq
// task invocations into calls on the application services. It is the worker-side
// twin of the HTTP adapter — same hexagon, different entrypoint.
package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/hibiken/asynq"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/application"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

// InspirationWorker handles inspiration tasks pulled from the queue.
type InspirationWorker struct {
	svc *application.InspirationService
}

// NewInspirationWorker wires the worker to the inspiration service.
func NewInspirationWorker(svc *application.InspirationService) *InspirationWorker {
	return &InspirationWorker{svc: svc}
}

// HandleGenerate decodes the task payload and runs the pipeline. Returning a
// non-nil error tells asynq to retry the task (bounded by MaxRetry set at
// enqueue time); the use case also records the failure on the job itself.
func (w *InspirationWorker) HandleGenerate(ctx context.Context, t *asynq.Task) error {
	var cmd usecase.GenerateInspirationCommand
	if err := json.Unmarshal(t.Payload(), &cmd); err != nil {
		// A malformed payload will never succeed; SkipRetry drops it.
		return fmt.Errorf("decode payload: %v: %w", err, asynq.SkipRetry)
	}
	slog.Info("worker: running inspiration", "job_id", cmd.JobID)
	if _, err := w.svc.RunCommand(ctx, cmd); err != nil {
		slog.Error("worker: inspiration failed", "job_id", cmd.JobID, "err", err)
		return err
	}
	slog.Info("worker: inspiration done", "job_id", cmd.JobID)
	return nil
}
