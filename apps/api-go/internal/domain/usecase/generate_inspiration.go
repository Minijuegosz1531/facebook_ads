package usecase

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
)

// GenerateInspirationCommand is the input for the AI pipeline.
type GenerateInspirationCommand struct {
	JobID          string
	ClientID       string
	ClientName     string
	Product        string
	Description    string
	Objective      string
	Country        string
	WebhookBaseURL string
	Platforms      []string
	ImageCount     int
	CopyCount      int
}

// GenerateInspirationUseCase runs: keywords → Ad Library → (images ∥ copies).
type GenerateInspirationUseCase struct {
	adLibrary port.AdLibrary
	imageGen  port.ImageGenerator
	copyGen   port.CopyGenerator
	jobStore  port.JobStore
}

func NewGenerateInspirationUseCase(
	adLibrary port.AdLibrary,
	imageGen port.ImageGenerator,
	copyGen port.CopyGenerator,
	jobStore port.JobStore,
) *GenerateInspirationUseCase {
	return &GenerateInspirationUseCase{adLibrary: adLibrary, imageGen: imageGen, copyGen: copyGen, jobStore: jobStore}
}

// Execute drives the pipeline, persisting the job after each phase so the
// frontend's polling sees progress (searching → generating → ready).
func (uc *GenerateInspirationUseCase) Execute(ctx context.Context, cmd GenerateInspirationCommand) (model.InspirationJob, error) {
	job, err := uc.jobStore.Get(ctx, cmd.JobID)
	if err != nil {
		// No existing job: start a fresh one.
		job = model.InspirationJob{
			ID:        cmd.JobID,
			ClientID:  cmd.ClientID,
			Country:   cmd.Country,
			Platforms: cmd.Platforms,
			CreatedAt: time.Now().UTC(),
		}
	}

	// fail records the error on the job, persists it, and returns it. A small
	// closure keeps the error-handling DRY across the phases below.
	fail := func(err error) (model.InspirationJob, error) {
		job.Status = model.JobFailed
		job.Error = err.Error()
		_ = uc.jobStore.Save(ctx, job)
		return job, err
	}

	// ── Phase 1: keywords + Ad Library research ──────────────────────────
	job.Status = model.JobSearching
	if err := uc.jobStore.Save(ctx, job); err != nil {
		return fail(fmt.Errorf("save job: %w", err))
	}
	keywords, err := uc.copyGen.ExtractKeywords(ctx, cmd.Description)
	if err != nil {
		return fail(fmt.Errorf("extract keywords: %w", err))
	}
	job.Keywords = keywords
	refs, err := uc.adLibrary.SearchTopAds(ctx, keywords, cmd.Country, cmd.Platforms, 5)
	if err != nil {
		return fail(fmt.Errorf("search ad library: %w", err))
	}
	job.ReferenceAds = refs

	// ── Phase 2: images ∥ copies (concurrent) ────────────────────────────
	//
	// Go concurrency: we launch two goroutines and wait for both with a
	// WaitGroup. Each goroutine writes to its OWN result variables, so there is
	// no shared mutable state and therefore no data race — no mutex needed.
	job.Status = model.JobGenerating
	if err := uc.jobStore.Save(ctx, job); err != nil {
		return fail(fmt.Errorf("save job: %w", err))
	}
	webhookURL := fmt.Sprintf("%s/webhooks/higgsfield/%s", strings.TrimRight(cmd.WebhookBaseURL, "/"), job.ID)

	var (
		wg         sync.WaitGroup
		requestIDs []string
		copies     []model.Copy
		imgErr     error
		copyErr    error
	)
	wg.Add(2)
	go func() {
		defer wg.Done()
		requestIDs, imgErr = uc.imageGen.Generate(ctx, refs, cmd.Product, cmd.Country, webhookURL, cmd.ImageCount)
	}()
	go func() {
		defer wg.Done()
		copies, copyErr = uc.copyGen.GenerateCopies(ctx, refs, cmd.ClientName, cmd.Product, cmd.Objective, cmd.Country, cmd.CopyCount)
	}()
	wg.Wait()

	if imgErr != nil {
		return fail(fmt.Errorf("generate images: %w", imgErr))
	}
	if copyErr != nil {
		return fail(fmt.Errorf("generate copies: %w", copyErr))
	}

	job.HiggsfieldRequestIDs = requestIDs
	job.Assets.Copies = copies
	// Stub generators return ready https URLs directly; the real Higgsfield flow
	// returns opaque request IDs and the webhook fills the URLs in later.
	for _, rid := range requestIDs {
		if strings.HasPrefix(rid, "http") {
			job.Assets.Images = append(job.Assets.Images, model.GeneratedImage{URL: rid, RequestID: rid})
		}
	}

	job.Status = model.JobReady
	if err := uc.jobStore.Save(ctx, job); err != nil {
		return fail(fmt.Errorf("save job: %w", err))
	}
	return job, nil
}
