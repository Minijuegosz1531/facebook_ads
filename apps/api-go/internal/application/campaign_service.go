// Package application contains the services that orchestrate use cases. A
// service is a thin façade: it groups the use cases that belong to one area
// (campaigns) and exposes them as a single dependency for the HTTP handlers.
// Business rules stay in the use cases; the service only wires and forwards.
package application

import (
	"context"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

// CampaignService groups every campaign-related operation behind one type.
type CampaignService struct {
	repo         port.CampaignRepository
	create       *usecase.CreateCampaignUseCase
	updateStatus *usecase.UpdateCampaignStatusUseCase
	insights     *usecase.GetInsightsUseCase
	publish      *usecase.SelectAssetsAndPublishUseCase
}

// NewCampaignService builds the service and all its use cases from the ports.
// The AdPlatform is passed per-call-site because in production it is bound to a
// specific client's ad account (see infrastructure.Container).
func NewCampaignService(adPlatform port.AdPlatform, repo port.CampaignRepository, jobStore port.JobStore) *CampaignService {
	create := usecase.NewCreateCampaignUseCase(adPlatform, repo)
	return &CampaignService{
		repo:         repo,
		create:       create,
		updateStatus: usecase.NewUpdateCampaignStatusUseCase(adPlatform, repo),
		insights:     usecase.NewGetInsightsUseCase(adPlatform, repo),
		publish:      usecase.NewSelectAssetsAndPublishUseCase(jobStore, create),
	}
}

func (s *CampaignService) Create(ctx context.Context, cmd usecase.CreateCampaignCommand) (model.Campaign, error) {
	return s.create.Execute(ctx, cmd)
}

func (s *CampaignService) PublishFromJob(ctx context.Context, cmd usecase.SelectAndPublishCommand) (model.Campaign, error) {
	return s.publish.Execute(ctx, cmd)
}

func (s *CampaignService) UpdateStatus(ctx context.Context, id string, status model.CampaignStatus) (model.Campaign, error) {
	return s.updateStatus.Execute(ctx, id, status)
}

func (s *CampaignService) Get(ctx context.Context, id string) (model.Campaign, error) {
	return s.repo.Get(ctx, id)
}

func (s *CampaignService) ListByClient(ctx context.Context, clientID string) ([]model.Campaign, error) {
	return s.repo.ListByClient(ctx, clientID)
}

func (s *CampaignService) Insights(ctx context.Context, id, since, until string) (map[string]any, error) {
	return s.insights.Execute(ctx, id, since, until)
}

func (s *CampaignService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
