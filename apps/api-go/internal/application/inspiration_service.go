package application

import (
	"context"
	"time"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

// InspirationService exposes the AI pipeline to the HTTP layer.
type InspirationService struct {
	jobStore    port.JobStore
	generate    *usecase.GenerateInspirationUseCase
	attachImage *usecase.AttachImageUseCase
}

func NewInspirationService(
	adLibrary port.AdLibrary,
	imageGen port.ImageGenerator,
	copyGen port.CopyGenerator,
	storage port.Storage,
	jobStore port.JobStore,
) *InspirationService {
	return &InspirationService{
		jobStore:    jobStore,
		generate:    usecase.NewGenerateInspirationUseCase(adLibrary, imageGen, copyGen, jobStore),
		attachImage: usecase.NewAttachImageUseCase(storage, jobStore),
	}
}

// AttachImage handles a Higgsfield webhook callback for one finished image.
func (s *InspirationService) AttachImage(ctx context.Context, jobID, requestID, imageURL string) error {
	return s.attachImage.Execute(ctx, jobID, requestID, imageURL)
}

// Start persists a pending job and returns immediately, so the HTTP handler can
// reply 202 Accepted while the heavy work runs elsewhere (a goroutine in stub
// mode, an arq/Redis worker in production).
func (s *InspirationService) Start(ctx context.Context, cmd usecase.GenerateInspirationCommand) (model.InspirationJob, error) {
	job := model.InspirationJob{
		ID:        cmd.JobID,
		ClientID:  cmd.ClientID,
		Country:   cmd.Country,
		Platforms: cmd.Platforms,
		Status:    model.JobPending,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.jobStore.Save(ctx, job); err != nil {
		return model.InspirationJob{}, err
	}
	return job, nil
}

// RunCommand executes the full pipeline. Callers running it in the background
// must pass a fresh context (e.g. context.Background()), NOT the HTTP request
// context — the latter is cancelled the moment the response is written.
func (s *InspirationService) RunCommand(ctx context.Context, cmd usecase.GenerateInspirationCommand) (model.InspirationJob, error) {
	return s.generate.Execute(ctx, cmd)
}

// Get returns the current state of a job for polling.
func (s *InspirationService) Get(ctx context.Context, jobID string) (model.InspirationJob, error) {
	return s.jobStore.Get(ctx, jobID)
}
