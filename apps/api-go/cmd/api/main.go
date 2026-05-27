// Command api is the entrypoint of the Go implementation of the Meta Ads
// Platform microservice. It mirrors the Python (FastAPI) service's hexagonal
// architecture, idiomatically in Go.
//
// Run it (stub mode, no external services):
//
//	cd apps/api-go
//	go run ./cmd/api
//	# then: curl localhost:8080/health
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	httpadapter "github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/inbound/http"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/config"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/infrastructure"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// 1. Config → 2. Container (composition root) → 3. HTTP handler.
	cfg := config.Load()
	container := infrastructure.NewContainer(cfg)
	handler := httpadapter.NewHandler(container)

	// Functional Options configure the server without a sprawling parameter list.
	srv := httpadapter.New(cfg.Addr, handler.Routes(),
		httpadapter.WithReadTimeout(15*time.Second),
		httpadapter.WithWriteTimeout(30*time.Second),
		httpadapter.WithIdleTimeout(60*time.Second),
	)

	// Graceful shutdown: ctx is cancelled on SIGINT/SIGTERM. We serve in a
	// goroutine and block on ctx.Done(), then drain in-flight requests.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("listening", "addr", cfg.Addr, "stubs", cfg.UseStubs)
		if err := srv.Start(); err != nil {
			slog.Error("server error", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "err", err)
		os.Exit(1)
	}
	slog.Info("bye")
}
