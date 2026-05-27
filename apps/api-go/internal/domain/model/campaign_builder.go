package model

import (
	"fmt"
	"time"
)

// CampaignBuilder constructs a Campaign aggregate step by step.
//
// # Pattern: Builder
//
// The Builder pattern separates the *construction* of a complex object from its
// representation. A Campaign is assembled from several remote calls (campaign +
// adset + creative + ad), each returning IDs we need to stitch together; a
// builder keeps that assembly readable and guarantees the object is only handed
// out once it is valid.
//
// # Idiomatic Go: fluent chaining
//
// Each "With…" method returns the *CampaignBuilder so calls can be chained:
//
//	camp, err := NewCampaignBuilder().
//		WithClient("client-1").
//		WithName("Summer Launch").
//		WithObjective("OUTCOME_SALES").
//		WithBudget(BudgetCampaign, 5000).
//		WithMetaIDs(metaCampaignID, adsetID, adID, creativeID).
//		AddAd(ad).
//		Build()
//
// Validation is deferred to Build, which returns an error instead of panicking —
// the Go way to report "this object can't be built from the given inputs".
type CampaignBuilder struct {
	campaign Campaign
	errs     []error
}

// NewCampaignBuilder returns a builder seeded with sensible defaults: a PAUSED
// status (all Meta objects are created paused) and timestamps set to now.
func NewCampaignBuilder() *CampaignBuilder {
	now := time.Now().UTC()
	return &CampaignBuilder{
		campaign: Campaign{
			Status:     StatusPaused,
			BudgetType: BudgetCampaign,
			CreatedAt:  now,
			UpdatedAt:  now,
		},
	}
}

// WithClient sets the owning client.
func (b *CampaignBuilder) WithClient(clientID string) *CampaignBuilder {
	b.campaign.ClientID = clientID
	return b
}

// WithName sets the campaign name.
func (b *CampaignBuilder) WithName(name string) *CampaignBuilder {
	b.campaign.Name = name
	return b
}

// WithObjective sets the campaign objective (e.g. OUTCOME_SALES).
func (b *CampaignBuilder) WithObjective(objective string) *CampaignBuilder {
	b.campaign.Objective = objective
	return b
}

// WithBudget sets the budget type and amount (in cents).
func (b *CampaignBuilder) WithBudget(t BudgetType, amount int) *CampaignBuilder {
	b.campaign.BudgetType = t
	b.campaign.BudgetAmount = amount
	return b
}

// WithMetaIDs records the IDs returned by the ad platform for each object.
func (b *CampaignBuilder) WithMetaIDs(campaignID, adsetID, adID, creativeID string) *CampaignBuilder {
	b.campaign.MetaCampaignID = campaignID
	b.campaign.MetaAdsetID = adsetID
	b.campaign.MetaAdID = adID
	b.campaign.MetaCreativeID = creativeID
	return b
}

// AddAd appends an ad to the campaign.
func (b *CampaignBuilder) AddAd(ad Ad) *CampaignBuilder {
	b.campaign.Ads = append(b.campaign.Ads, ad)
	return b
}

// Build validates the accumulated state and returns the Campaign. If any
// required field is missing it returns a wrapped ErrValidation describing what
// is wrong, and the zero Campaign.
func (b *CampaignBuilder) Build() (Campaign, error) {
	if b.campaign.ClientID == "" {
		b.errs = append(b.errs, fmt.Errorf("client id is required"))
	}
	if b.campaign.Name == "" {
		b.errs = append(b.errs, fmt.Errorf("name is required"))
	}
	if b.campaign.Objective == "" {
		b.errs = append(b.errs, fmt.Errorf("objective is required"))
	}
	if len(b.errs) > 0 {
		return Campaign{}, fmt.Errorf("%w: %v", ErrValidation, b.errs)
	}
	return b.campaign, nil
}
