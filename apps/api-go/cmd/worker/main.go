// Command worker is the background job processor — the Go counterpart of the
// Python `arq` worker. It consumes tasks from Redis (via asynq) and runs the
// same application use cases the HTTP API would, in a SEPARATE process so it
// scales independently of request handling.
//
// Run it (needs Redis on REDIS_ADDR, default 127.0.0.1:6379):
//
//	cd apps/api-go
//	REDIS_ADDR=127.0.0.1:6379 go run ./cmd/worker
//
// and run the API with the asynq driver so it enqueues instead of using a
// goroutine:
//
//	QUEUE_DRIVER=asynq go run ./cmd/api
package main

import (
	"log/slog"
	"os"

	"github.com/hibiken/asynq"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/inbound/worker"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/outbound/queue"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/config"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/infrastructure"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, nil)))

	cfg := config.Load()
	// The worker only makes sense with the Redis-backed job store so it shares
	// state with the API process; force the asynq driver regardless of env.
	cfg.QueueDriver = "asynq"

	container := infrastructure.NewContainer(cfg)
	insp := worker.NewInspirationWorker(container.InspirationService())

	// asynq.Server is the consumer side: a pool of `Concurrency` goroutines that
	// pull tasks from Redis. Concurrency is the analogue of arq's max_jobs.
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.RedisAddr},
		asynq.Config{Concurrency: 10},
	)

	// ServeMux routes a task type to its handler, just like an HTTP mux.
	mux := asynq.NewServeMux()
	mux.HandleFunc(queue.TaskInspirationGenerate, insp.HandleGenerate)

	slog.Info("worker starting", "redis", cfg.RedisAddr, "concurrency", 10)
	// Run blocks, handling SIGINT/SIGTERM with graceful shutdown internally.
	if err := srv.Run(mux); err != nil {
		slog.Error("worker stopped with error", "err", err)
		os.Exit(1)
	}
}
