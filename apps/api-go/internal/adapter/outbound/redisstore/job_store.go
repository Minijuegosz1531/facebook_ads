// Package redisstore holds Redis-backed outbound adapters. The inspiration job
// store lives here so the API process and the worker process share job state
// (the in-memory stub can't cross process boundaries).
package redisstore

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
)

// ttl matches the Python service: inspiration jobs live 24h in Redis.
const ttl = 24 * time.Hour

// JobStore implements port.JobStore on top of Redis.
type JobStore struct {
	rdb *redis.Client
}

// NewJobStore connects to Redis at addr (host:port).
func NewJobStore(addr string) *JobStore {
	return &JobStore{rdb: redis.NewClient(&redis.Options{Addr: addr})}
}

func key(id string) string { return "inspiration:job:" + id }

// Save serializes the job to JSON and stores it with a TTL.
func (s *JobStore) Save(ctx context.Context, job model.InspirationJob) error {
	data, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal job: %w", err)
	}
	if err := s.rdb.Set(ctx, key(job.ID), data, ttl).Err(); err != nil {
		return fmt.Errorf("redis set: %w", err)
	}
	return nil
}

// Get loads a job; a missing key maps to model.ErrNotFound.
func (s *JobStore) Get(ctx context.Context, id string) (model.InspirationJob, error) {
	data, err := s.rdb.Get(ctx, key(id)).Bytes()
	if errors.Is(err, redis.Nil) {
		return model.InspirationJob{}, fmt.Errorf("job %q: %w", id, model.ErrNotFound)
	}
	if err != nil {
		return model.InspirationJob{}, fmt.Errorf("redis get: %w", err)
	}
	var job model.InspirationJob
	if err := json.Unmarshal(data, &job); err != nil {
		return model.InspirationJob{}, fmt.Errorf("unmarshal job: %w", err)
	}
	return job, nil
}

// Close releases the Redis connection.
func (s *JobStore) Close() error { return s.rdb.Close() }
