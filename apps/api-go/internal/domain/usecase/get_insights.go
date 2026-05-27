package usecase

import (
	"context"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
)

// defaultInsightFields are the metrics requested when none are specified.
var defaultInsightFields = []string{"impressions", "clicks", "spend", "ctr", "cpc", "reach"}

// GetInsightsUseCase fetches performance metrics for a campaign.
type GetInsightsUseCase struct {
	adPlatform port.AdPlatform
	repo       port.CampaignRepository
}

func NewGetInsightsUseCase(adPlatform port.AdPlatform, repo port.CampaignRepository) *GetInsightsUseCase {
	return &GetInsightsUseCase{adPlatform: adPlatform, repo: repo}
}

// Execute returns insights for the campaign over [since, until]. A campaign that
// was never pushed to Meta has no metrics, so we return an empty data set.
func (uc *GetInsightsUseCase) Execute(ctx context.Context, campaignID, since, until string) (map[string]any, error) {
	campaign, err := uc.repo.Get(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	if campaign.MetaCampaignID == "" {
		return map[string]any{"data": []any{}}, nil
	}
	return uc.adPlatform.GetInsights(ctx, campaign.MetaCampaignID, defaultInsightFields, since, until)
}
