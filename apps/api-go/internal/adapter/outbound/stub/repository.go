// Package stub provides in-memory / deterministic implementations of every
// outbound port. They let the whole API run end-to-end with no Postgres, Redis,
// Meta CLI, Higgsfield or Anthropic credentials — used by local dev and tests.
//
// Because HTTP handlers run concurrently (each request in its own goroutine),
// the in-memory stores guard their maps with a sync.RWMutex. Reading or writing
// a Go map from multiple goroutines without synchronization is a data race and
// will crash with "concurrent map writes" — the mutex is not optional here.
package stub

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
)

// idSeq backs nextID; atomic so concurrent callers get unique values lock-free.
var idSeq atomic.Uint64

// nextID returns a deterministic, unique id like "camp_000007".
func nextID(prefix string) string {
	return fmt.Sprintf("%s_%06d", prefix, idSeq.Add(1))
}

// ── Campaign repository ──────────────────────────────────────────────────────

// InMemoryCampaignRepository implements port.CampaignRepository with a map.
type InMemoryCampaignRepository struct {
	mu    sync.RWMutex
	store map[string]model.Campaign
}

func NewInMemoryCampaignRepository() *InMemoryCampaignRepository {
	return &InMemoryCampaignRepository{store: make(map[string]model.Campaign)}
}

func (r *InMemoryCampaignRepository) Save(_ context.Context, c model.Campaign) (model.Campaign, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if c.ID == "" {
		c.ID = nextID("camp")
	}
	r.store[c.ID] = c
	return c, nil
}

func (r *InMemoryCampaignRepository) Get(_ context.Context, id string) (model.Campaign, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.store[id]
	if !ok {
		return model.Campaign{}, fmt.Errorf("campaign %q: %w", id, model.ErrNotFound)
	}
	return c, nil
}

func (r *InMemoryCampaignRepository) ListByClient(_ context.Context, clientID string) ([]model.Campaign, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]model.Campaign, 0)
	for _, c := range r.store {
		if c.ClientID == clientID {
			out = append(out, c)
		}
	}
	return out, nil
}

func (r *InMemoryCampaignRepository) UpdateStatus(_ context.Context, id string, status model.CampaignStatus) (model.Campaign, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.store[id]
	if !ok {
		return model.Campaign{}, fmt.Errorf("campaign %q: %w", id, model.ErrNotFound)
	}
	c.Status = status
	for i := range c.Ads {
		c.Ads[i].Status = status
	}
	r.store[id] = c
	return c, nil
}

func (r *InMemoryCampaignRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.store, id)
	return nil
}

// ── Job store ────────────────────────────────────────────────────────────────

// InMemoryJobStore implements port.JobStore.
type InMemoryJobStore struct {
	mu    sync.RWMutex
	store map[string]model.InspirationJob
}

func NewInMemoryJobStore() *InMemoryJobStore {
	return &InMemoryJobStore{store: make(map[string]model.InspirationJob)}
}

func (s *InMemoryJobStore) Save(_ context.Context, job model.InspirationJob) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.store[job.ID] = job
	return nil
}

func (s *InMemoryJobStore) Get(_ context.Context, id string) (model.InspirationJob, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	job, ok := s.store[id]
	if !ok {
		return model.InspirationJob{}, fmt.Errorf("job %q: %w", id, model.ErrNotFound)
	}
	return job, nil
}

// ── Client repository (seeded reference data) ────────────────────────────────

// InMemoryClientRepository implements port.ClientRepository with fixed seed data.
type InMemoryClientRepository struct {
	clients []model.Client
}

func NewInMemoryClientRepository() *InMemoryClientRepository {
	return &InMemoryClientRepository{clients: []model.Client{
		{ID: "11111111-1111-1111-1111-111111111111", Name: "Cafetería Andina", MetaAdAccountID: "act_1001", MetaPageID: "page_1001", MetaPixelID: "pixel_1001"},
		{ID: "22222222-2222-2222-2222-222222222222", Name: "Moda Tropical", MetaAdAccountID: "act_1002", MetaPageID: "page_1002", MetaPixelID: "pixel_1002"},
	}}
}

func (r *InMemoryClientRepository) ListAll(_ context.Context) ([]model.Client, error) {
	return r.clients, nil
}

func (r *InMemoryClientRepository) Get(_ context.Context, id string) (model.Client, error) {
	for _, c := range r.clients {
		if c.ID == id {
			return c, nil
		}
	}
	return model.Client{}, fmt.Errorf("client %q: %w", id, model.ErrNotFound)
}
