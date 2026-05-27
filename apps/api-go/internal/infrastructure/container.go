// Package infrastructure wires concrete adapters to the application services.
// It is the ONLY place that imports concrete adapters; the domain and
// application layers depend solely on interfaces. Swapping stub for real
// implementations is a change confined to this file.
package infrastructure

import (
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/outbound/queue"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/outbound/redisstore"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/outbound/stub"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/application"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/config"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
)

// Container holds the singleton adapters and services shared across the app.
//
// # Pattern: Factory / Composition Root
//
// The Container is the application's composition root: a single factory that
// decides which concrete adapter implements each port. The choice is driven by
// config (UseStubs, QueueDriver) — callers never see a concrete type.
type Container struct {
	Cfg config.Config

	campaignRepo port.CampaignRepository
	clientRepo   port.ClientRepository
	jobStore     port.JobStore
	adLibrary    port.AdLibrary
	imageGen     port.ImageGenerator
	copyGen      port.CopyGenerator
	storage      port.Storage

	inspiration *application.InspirationService
	enqueuer    application.Enqueuer
}

// NewContainer builds the container and its singletons from config.
func NewContainer(cfg config.Config) *Container {
	c := &Container{Cfg: cfg}
	c.campaignRepo = c.buildCampaignRepo()
	c.clientRepo = c.buildClientRepo()
	c.jobStore = c.buildJobStore()
	c.adLibrary = c.buildAdLibrary()
	c.imageGen = c.buildImageGenerator()
	c.copyGen = c.buildCopyGenerator()
	c.storage = c.buildStorage()

	// Build the inspiration service once, then the enqueuer (the in-process
	// enqueuer needs the service to call RunCommand).
	c.inspiration = application.NewInspirationService(c.adLibrary, c.imageGen, c.copyGen, c.storage, c.jobStore)
	c.enqueuer = c.buildEnqueuer()
	return c
}

// ── outbound adapter factories ───────────────────────────────────────────────
// Each returns an interface (the port). The concrete type depends on config.

func (c *Container) buildCampaignRepo() port.CampaignRepository {
	// if !c.Cfg.UseStubs { return postgres.NewCampaignRepository(c.Cfg.DatabaseURL) }
	return stub.NewInMemoryCampaignRepository()
}

func (c *Container) buildClientRepo() port.ClientRepository {
	return stub.NewInMemoryClientRepository()
}

// buildJobStore: with the asynq driver the API and the worker are separate
// processes, so job state must live in Redis (shared). Otherwise in-memory.
func (c *Container) buildJobStore() port.JobStore {
	if c.Cfg.UsesAsynq() {
		return redisstore.NewJobStore(c.Cfg.RedisAddr)
	}
	return stub.NewInMemoryJobStore()
}

func (c *Container) buildAdLibrary() port.AdLibrary {
	// if !c.Cfg.UseStubs { return meta.NewAdLibrary(c.Cfg.MetaSystemUserToken) }
	return stub.NewAdLibrary()
}

func (c *Container) buildImageGenerator() port.ImageGenerator {
	// if !c.Cfg.UseStubs { return higgsfield.New(...) }
	return stub.NewImageGenerator()
}

func (c *Container) buildCopyGenerator() port.CopyGenerator {
	// if !c.Cfg.UseStubs { return claude.New(c.Cfg.AnthropicAPIKey) }
	return stub.NewCopyGenerator()
}

func (c *Container) buildStorage() port.Storage {
	// if !c.Cfg.UseStubs { return gcs.New(c.Cfg.GCSBucketName) }
	return stub.NewStorage()
}

// buildEnqueuer chooses how background inspiration jobs run.
func (c *Container) buildEnqueuer() application.Enqueuer {
	if c.Cfg.UsesAsynq() {
		return queue.NewAsynqEnqueuer(c.Cfg.RedisAddr)
	}
	return queue.NewInProcess(c.inspiration)
}

// ── inbound service factories ────────────────────────────────────────────────

// CampaignService builds a campaign service bound to a client's ad account.
// In production the AdPlatform (Meta CLI) is created per request because it
// carries the client's AD_ACCOUNT_ID; in stub mode it's a shared fake.
func (c *Container) CampaignService(adAccountID string) *application.CampaignService {
	var adPlatform port.AdPlatform = stub.NewAdPlatform()
	// if !c.Cfg.UseStubs { adPlatform = meta.NewCLIAdapter(c.Cfg.MetaSystemUserToken, adAccountID) }
	_ = adAccountID
	return application.NewCampaignService(adPlatform, c.campaignRepo, c.jobStore)
}

// InspirationService returns the shared inspiration service.
func (c *Container) InspirationService() *application.InspirationService { return c.inspiration }

// Enqueuer returns the configured background-job enqueuer.
func (c *Container) Enqueuer() application.Enqueuer { return c.enqueuer }

// ClientRepo exposes the client repository for read-only handlers.
func (c *Container) ClientRepo() port.ClientRepository { return c.clientRepo }
