// Package port declares the interfaces that connect the domain to the outside
// world — the "ports" of the Hexagonal (Ports & Adapters) architecture.
//
// # Outbound ports
//
// An *outbound* port is something the domain NEEDS from the outside (a database,
// the Meta CLI, an AI provider). The domain declares the interface; concrete
// implementations ("adapters") live in internal/adapter/outbound and are
// injected at wiring time. The use cases depend only on these interfaces, never
// on a concrete implementation — that is the dependency-inversion that lets us
// swap Postgres for an in-memory map, or the real Meta CLI for a stub, without
// touching business logic.
//
// # A note on Go idioms
//
// Unlike Python (where we wrote abstract base classes named IAdPlatform), Go
// interfaces are satisfied *implicitly* — a type implements an interface simply
// by having the right methods, with no "implements" keyword. Conventionally Go
// does NOT prefix interfaces with "I"; the name describes the capability. So the
// Python ICampaignRepository becomes CampaignRepository here.
package port

import (
	"context"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
)

// AdPlatform abstracts the advertising platform (implemented by the Meta Ads CLI
// adapter in production, or a stub in tests/dev). Every method takes a
// context.Context so callers can cancel slow CLI calls or attach deadlines.
type AdPlatform interface {
	CreateCampaign(ctx context.Context, name, objective string, budget *int) (model.Campaign, error)
	CreateAdset(ctx context.Context, campaignID string, budget *int, pixelID string) (model.Adset, error)
	CreateCreative(ctx context.Context, c model.Creative) (model.Creative, error)
	CreateAd(ctx context.Context, adsetID, creativeID string) (model.Ad, error)
	UpdateStatus(ctx context.Context, objectType, objectID string, status model.CampaignStatus) error
	GetInsights(ctx context.Context, campaignID string, fields []string, since, until string) (map[string]any, error)
}

// CampaignRepository persists campaigns. The stub uses an in-memory map; a real
// adapter would back this with PostgreSQL.
type CampaignRepository interface {
	Save(ctx context.Context, c model.Campaign) (model.Campaign, error)
	Get(ctx context.Context, id string) (model.Campaign, error)
	ListByClient(ctx context.Context, clientID string) ([]model.Campaign, error)
	UpdateStatus(ctx context.Context, id string, status model.CampaignStatus) (model.Campaign, error)
	Delete(ctx context.Context, id string) error
}

// ClientRepository provides read access to advertiser clients (reference data).
type ClientRepository interface {
	ListAll(ctx context.Context) ([]model.Client, error)
	Get(ctx context.Context, id string) (model.Client, error)
}

// AdLibrary searches the Meta Ad Library for top-performing reference ads.
type AdLibrary interface {
	SearchTopAds(ctx context.Context, keywords []string, country string, platforms []string, limit int) ([]model.ReferenceAd, error)
}

// ImageGenerator kicks off ad-image generation (Higgsfield). It returns provider
// request IDs; in the real flow a webhook later delivers the finished image URLs.
type ImageGenerator interface {
	Generate(ctx context.Context, refs []model.ReferenceAd, product, country, webhookURL string, count int) ([]string, error)
}

// CopyGenerator extracts keywords and writes ad copy (Claude).
type CopyGenerator interface {
	ExtractKeywords(ctx context.Context, description string) ([]string, error)
	GenerateCopies(ctx context.Context, refs []model.ReferenceAd, clientName, product, objective, country string, count int) ([]model.Copy, error)
}

// Storage persists assets permanently (GCS); returns the public URL.
type Storage interface {
	StoreFromURL(ctx context.Context, sourceURL, destKey string) (string, error)
}

// JobStore holds short-lived inspiration job state (Redis in production).
type JobStore interface {
	Save(ctx context.Context, job model.InspirationJob) error
	Get(ctx context.Context, id string) (model.InspirationJob, error)
}
