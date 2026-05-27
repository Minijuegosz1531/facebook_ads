// Package usecase contains the business logic of the application. Use cases
// orchestrate the domain and the outbound ports; they depend ONLY on interfaces
// from internal/domain/port and types from internal/domain/model — never on a
// concrete adapter, an HTTP framework, or a database driver. That is what makes
// them unit-testable with simple fakes.
package usecase

import (
	"context"
	"fmt"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
)

// CreateCampaignCommand is the input DTO for CreateCampaignUseCase. Using a
// command struct (rather than a long argument list) keeps the call site
// readable and makes adding a field a non-breaking change.
type CreateCampaignCommand struct {
	ClientID     string
	AdAccountID  string
	Name         string
	Objective    string
	BudgetType   model.BudgetType
	BudgetAmount int // cents
	PageID       string
	PixelID      string
	ImageURL     string
	Headline     string
	Body         string
	CTA          string
	LinkURL      string
}

// CreateCampaignUseCase creates a full campaign (campaign → adset → creative →
// ad) on the ad platform and persists the result, all in PAUSED state.
type CreateCampaignUseCase struct {
	adPlatform port.AdPlatform
	repo       port.CampaignRepository
}

// NewCreateCampaignUseCase wires the use case with its outbound ports.
//
// # Idiomatic Go: constructor injection
//
// Go has no DI container baked into the language; we inject dependencies through
// the constructor and store them on the struct. The parameters are interfaces,
// so callers pass whichever implementation they like (stub or real).
func NewCreateCampaignUseCase(adPlatform port.AdPlatform, repo port.CampaignRepository) *CreateCampaignUseCase {
	return &CreateCampaignUseCase{adPlatform: adPlatform, repo: repo}
}

// Execute runs the four-step pipeline. The use case does not know that
// adPlatform is the Meta CLI — only that it satisfies the AdPlatform port.
func (uc *CreateCampaignUseCase) Execute(ctx context.Context, cmd CreateCampaignCommand) (model.Campaign, error) {
	isCBO := cmd.BudgetType == model.BudgetCampaign

	// Budget lives on the campaign for CBO, otherwise on the adset.
	var campaignBudget, adsetBudget *int
	if isCBO {
		campaignBudget = &cmd.BudgetAmount
	} else {
		adsetBudget = &cmd.BudgetAmount
	}

	campaign, err := uc.adPlatform.CreateCampaign(ctx, cmd.Name, cmd.Objective, campaignBudget)
	if err != nil {
		return model.Campaign{}, fmt.Errorf("create campaign: %w", err)
	}
	adset, err := uc.adPlatform.CreateAdset(ctx, campaign.MetaCampaignID, adsetBudget, cmd.PixelID)
	if err != nil {
		return model.Campaign{}, fmt.Errorf("create adset: %w", err)
	}
	creative, err := uc.adPlatform.CreateCreative(ctx, model.Creative{
		PageID:   cmd.PageID,
		ImageURL: cmd.ImageURL,
		Headline: cmd.Headline,
		Body:     cmd.Body,
		CTA:      cmd.CTA,
		LinkURL:  cmd.LinkURL,
	})
	if err != nil {
		return model.Campaign{}, fmt.Errorf("create creative: %w", err)
	}
	ad, err := uc.adPlatform.CreateAd(ctx, adset.MetaAdsetID, creative.MetaCreativeID)
	if err != nil {
		return model.Campaign{}, fmt.Errorf("create ad: %w", err)
	}

	// Assemble the aggregate with the Builder, then persist it.
	built, err := model.NewCampaignBuilder().
		WithClient(cmd.ClientID).
		WithName(cmd.Name).
		WithObjective(cmd.Objective).
		WithBudget(cmd.BudgetType, cmd.BudgetAmount).
		WithMetaIDs(campaign.MetaCampaignID, adset.MetaAdsetID, ad.MetaAdID, creative.MetaCreativeID).
		AddAd(model.Ad{
			MetaAdID:       ad.MetaAdID,
			MetaCreativeID: creative.MetaCreativeID,
			Headline:       cmd.Headline,
			Body:           cmd.Body,
			ImageURL:       cmd.ImageURL,
			CTA:            cmd.CTA,
			Status:         model.StatusPaused,
		}).
		Build()
	if err != nil {
		return model.Campaign{}, err
	}

	return uc.repo.Save(ctx, built)
}
