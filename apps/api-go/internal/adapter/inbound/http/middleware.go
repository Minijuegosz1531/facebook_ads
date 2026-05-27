package http

import (
	"log/slog"
	"net/http"
	"time"
)

// Middleware decorates an http.Handler with cross-cutting behavior.
//
// # Pattern: Decorator / Middleware
//
// A middleware is a function that takes a handler and returns a new handler
// wrapping it. Composing them (withRecover(withLogging(mux))) builds an onion
// where each layer can act before and after the inner handler — the standard
// Go way to add logging, auth, recovery, etc. without touching the handlers.
type Middleware func(http.Handler) http.Handler

// withLogging logs method, path, status and latency for each request.
func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"dur", time.Since(start).String(),
		)
	})
}

// withRecover turns a panic in any handler into a 500 instead of crashing the
// whole server (each request runs in its own goroutine; an unrecovered panic
// there would take the process down).
func withRecover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic recovered", "err", rec, "path", r.URL.Path)
				writeJSON(w, http.StatusInternalServerError, errorBody{Detail: "internal error"})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// statusRecorder captures the status code written by the handler so the logging
// middleware can report it.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}
