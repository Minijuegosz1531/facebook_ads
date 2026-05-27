package stub

import (
	"context"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
)

// AdPlatform is a fake port.AdPlatform that returns deterministic fake Meta IDs
// without ever shelling out to the real CLI.
type AdPlatform struct{}

func NewAdPlatform() *AdPlatform { return &AdPlatform{} }

func (AdPlatform) CreateCampaign(_ context.Context, name, objective string, _ *int) (model.Campaign, error) {
	return model.Campaign{MetaCampaignID: nextID("metacamp"), Name: name, Objective: objective}, nil
}

func (AdPlatform) CreateAdset(_ context.Context, campaignID string, budget *int, pixelID string) (model.Adset, error) {
	return model.Adset{CampaignID: campaignID, MetaAdsetID: nextID("metaadset"), Budget: budget, PixelID: pixelID}, nil
}

func (AdPlatform) CreateCreative(_ context.Context, c model.Creative) (model.Creative, error) {
	c.MetaCreativeID = nextID("metacreative")
	return c, nil
}

func (AdPlatform) CreateAd(_ context.Context, _ /*adsetID*/, creativeID string) (model.Ad, error) {
	return model.Ad{MetaAdID: nextID("metaad"), MetaCreativeID: creativeID, Status: model.StatusPaused}, nil
}

func (AdPlatform) UpdateStatus(_ context.Context, _, _ string, _ model.CampaignStatus) error {
	return nil
}

func (AdPlatform) GetInsights(_ context.Context, _ string, _ []string, since, until string) (map[string]any, error) {
	return map[string]any{
		"data": []map[string]any{{
			"impressions": 12450, "clicks": 312, "spend": 84.20,
			"ctr": 2.51, "cpc": 0.27, "reach": 9810,
			"date_start": since, "date_stop": until,
		}},
	}, nil
}
