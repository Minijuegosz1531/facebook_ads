// Package http is the inbound HTTP adapter: it translates HTTP requests into
// calls on the application services and back into JSON responses. It uses only
// the standard library (net/http) — Go 1.22+ method+path routing means no third
// party router is required.
package http

import (
	"context"
	"net/http"
	"time"
)

// Server wraps *http.Server with graceful-shutdown support.
type Server struct {
	httpServer *http.Server
}

// Option configures the underlying *http.Server.
//
// # Pattern: Functional Options
//
// Go has no named/optional arguments. The idiomatic way to offer optional,
// extensible configuration is to pass a variadic list of "option" functions,
// each mutating the target. Callers set only what they care about:
//
//	srv := http.New(":8080", handler,
//		http.WithReadTimeout(10*time.Second),
//		http.WithWriteTimeout(30*time.Second),
//	)
//
// Adding a new option later never breaks existing call sites — the key
// advantage over a growing config struct or a long parameter list.
type Option func(*http.Server)

// WithReadTimeout sets the maximum duration for reading the entire request.
func WithReadTimeout(d time.Duration) Option {
	return func(s *http.Server) { s.ReadTimeout = d }
}

// WithWriteTimeout sets the maximum duration before timing out writes.
func WithWriteTimeout(d time.Duration) Option {
	return func(s *http.Server) { s.WriteTimeout = d }
}

// WithIdleTimeout sets the keep-alive idle timeout.
func WithIdleTimeout(d time.Duration) Option {
	return func(s *http.Server) { s.IdleTimeout = d }
}

// New builds a Server with sane defaults, then applies the given options.
func New(addr string, handler http.Handler, opts ...Option) *Server {
	hs := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	for _, opt := range opts {
		opt(hs)
	}
	return &Server{httpServer: hs}
}

// Start begins serving and blocks until the server stops.
func (s *Server) Start() error {
	if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

// Shutdown gracefully drains in-flight requests, bounded by ctx.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}
