// Package model holds the pure domain entities. It has no dependencies on any
// other layer — the inner core of the hexagon.
package model

import "time"

// CampaignStatus is the lifecycle state shared by campaigns and ads.
type CampaignStatus string

const (
	StatusPaused   CampaignStatus = "PAUSED"
	StatusActive   CampaignStatus = "ACTIVE"
	StatusArchived CampaignStatus = "ARCHIVED"
)

// BudgetType selects where the budget lives: campaign-level (CBO) or per adset.
type BudgetType string

const (
	BudgetCampaign BudgetType = "campaign"
	BudgetAdset    BudgetType = "adset"
)

type Creative struct {
	PageID         string
	ImageURL       string
	Headline       string
	Body           string
	CTA            string
	LinkURL        string
	MetaCreativeID string
}

type Adset struct {
	CampaignID  string
	MetaAdsetID string
	Budget      *int
	PixelID     string
}

type Ad struct {
	ID             string
	CampaignID     string
	MetaAdID       string
	MetaCreativeID string
	Headline       string
	Body           string
	ImageURL       string
	CTA            string
	Status         CampaignStatus
}

type Campaign struct {
	ID             string
	ClientID       string
	MetaCampaignID string
	MetaAdsetID    string
	MetaAdID       string
	MetaCreativeID string
	Name           string
	Objective      string
	BudgetType     BudgetType
	BudgetAmount   int // cents
	Status         CampaignStatus
	Ads            []Ad
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
