// Package config loads runtime settings from environment variables, mirroring
// the Python service's pydantic Settings. Defaults make the service runnable in
// stub mode with zero configuration.
package config

import (
	"os"
	"strconv"
)

// Config holds all runtime settings.
type Config struct {
	// UseStubs selects in-memory/fake adapters over real ones. Default true so
	// the service boots with no external dependencies.
	UseStubs bool
	// Addr is the listen address for the HTTP server, e.g. ":8080".
	Addr string
	// BaseURL is the public URL used to build webhook callbacks.
	BaseURL string
	// Environment is "development" | "production".
	Environment string

	// Credentials / DSNs — only consulted when UseStubs is false.
	MetaSystemUserToken string
	AnthropicAPIKey     string
	DatabaseURL         string
	RedisURL            string

	// QueueDriver selects how background inspiration jobs are run:
	//   "inprocess" (default) → a goroutine in the API process (no Redis).
	//   "asynq"               → enqueue to Redis; a separate `cmd/worker`
	//                           process consumes and runs them.
	// In "asynq" mode the job store is also backed by Redis so the API and the
	// worker (two processes) share job state.
	QueueDriver string
	// RedisAddr is the host:port used by asynq and the Redis job store.
	RedisAddr string
}

// UsesAsynq reports whether the asynq/Redis queue driver is selected.
func (c Config) UsesAsynq() bool { return c.QueueDriver == "asynq" }

// Load reads configuration from the environment, applying defaults.
func Load() Config {
	return Config{
		UseStubs:            envBool("USE_STUBS", true),
		Addr:                env("ADDR", ":8080"),
		BaseURL:             env("BASE_URL", "http://localhost:8080"),
		Environment:         env("ENVIRONMENT", "development"),
		MetaSystemUserToken: env("META_SYSTEM_USER_TOKEN", "stub-token"),
		AnthropicAPIKey:     env("ANTHROPIC_API_KEY", "stub-key"),
		DatabaseURL:         env("DATABASE_URL", ""),
		RedisURL:            env("REDIS_URL", "redis://localhost:6379"),
		QueueDriver:         env("QUEUE_DRIVER", "inprocess"),
		RedisAddr:           env("REDIS_ADDR", "127.0.0.1:6379"),
	}
}

// env returns the variable or a fallback.
func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

// envBool parses a boolean env var ("1", "true", "yes"...) with a fallback.
func envBool(key string, fallback bool) bool {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	if b, err := strconv.ParseBool(v); err == nil {
		return b
	}
	// Accept "yes"/"no" beyond Go's strconv set.
	switch v {
	case "yes", "on":
		return true
	case "no", "off":
		return false
	}
	return fallback
}
