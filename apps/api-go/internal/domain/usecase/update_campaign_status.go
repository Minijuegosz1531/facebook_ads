package usecase

import (
	"context"
	"fmt"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
)

// UpdateCampaignStatusUseCase activates, pauses or archives a campaign both on
// the ad platform and in our store, keeping the two in sync.
type UpdateCampaignStatusUseCase struct {
	adPlatform port.AdPlatform
	repo       port.CampaignRepository
}

func NewUpdateCampaignStatusUseCase(adPlatform port.AdPlatform, repo port.CampaignRepository) *UpdateCampaignStatusUseCase {
	return &UpdateCampaignStatusUseCase{adPlatform: adPlatform, repo: repo}
}

// Execute pushes the new status to the platform first, then records it locally.
// If the campaign is unknown the repository returns ErrNotFound, which the HTTP
// layer maps to 404.
func (uc *UpdateCampaignStatusUseCase) Execute(ctx context.Context, campaignID string, status model.CampaignStatus) (model.Campaign, error) {
	campaign, err := uc.repo.Get(ctx, campaignID)
	if err != nil {
		return model.Campaign{}, err
	}
	if campaign.MetaCampaignID != "" {
		if err := uc.adPlatform.UpdateStatus(ctx, "campaign", campaign.MetaCampaignID, status); err != nil {
			return model.Campaign{}, fmt.Errorf("platform update status: %w", err)
		}
	}
	return uc.repo.UpdateStatus(ctx, campaignID, status)
}
