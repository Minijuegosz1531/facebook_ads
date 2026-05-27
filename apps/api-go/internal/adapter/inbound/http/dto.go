package http

import "github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"

// The response DTOs use snake_case json tags so this Go API is wire-compatible
// with the Python service and the Next.js frontend (same shapes).

type adResponse struct {
	MetaAdID string `json:"meta_ad_id"`
	Headline string `json:"headline"`
	Body     string `json:"body"`
	ImageURL string `json:"image_url"`
	CTA      string `json:"cta"`
	Status   string `json:"status"`
}

type campaignResponse struct {
	ID             string       `json:"id"`
	ClientID       string       `json:"client_id"`
	MetaCampaignID string       `json:"meta_campaign_id"`
	Name           string       `json:"name"`
	Objective      string       `json:"objective"`
	BudgetType     string       `json:"budget_type"`
	BudgetAmount   int          `json:"budget_amount"`
	Status         string       `json:"status"`
	Ads            []adResponse `json:"ads"`
}

func toCampaignResponse(c model.Campaign) campaignResponse {
	ads := make([]adResponse, 0, len(c.Ads))
	for _, a := range c.Ads {
		ads = append(ads, adResponse{
			MetaAdID: a.MetaAdID, Headline: a.Headline, Body: a.Body,
			ImageURL: a.ImageURL, CTA: a.CTA, Status: string(a.Status),
		})
	}
	return campaignResponse{
		ID: c.ID, ClientID: c.ClientID, MetaCampaignID: c.MetaCampaignID,
		Name: c.Name, Objective: c.Objective, BudgetType: string(c.BudgetType),
		BudgetAmount: c.BudgetAmount, Status: string(c.Status), Ads: ads,
	}
}

type copyResponse struct {
	Headline string `json:"headline"`
	Body     string `json:"body"`
	CTA      string `json:"cta"`
}

type jobResponse struct {
	JobID           string         `json:"job_id"`
	Status          string         `json:"status"`
	Keywords        []string       `json:"keywords"`
	GeneratedImages []string       `json:"generated_images"`
	GeneratedCopies []copyResponse `json:"generated_copies"`
	Error           string         `json:"error,omitempty"`
}

func toJobResponse(j model.InspirationJob) jobResponse {
	images := make([]string, 0, len(j.Assets.Images))
	for _, img := range j.Assets.Images {
		images = append(images, img.URL)
	}
	copies := make([]copyResponse, 0, len(j.Assets.Copies))
	for _, c := range j.Assets.Copies {
		copies = append(copies, copyResponse{Headline: c.Headline, Body: c.Body, CTA: c.CTA})
	}
	return jobResponse{
		JobID: j.ID, Status: string(j.Status), Keywords: j.Keywords,
		GeneratedImages: images, GeneratedCopies: copies, Error: j.Error,
	}
}

type clientResponse struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	MetaAdAccountID string `json:"meta_ad_account_id"`
	MetaPageID      string `json:"meta_page_id"`
	MetaPixelID     string `json:"meta_pixel_id"`
}

func toClientResponse(c model.Client) clientResponse {
	return clientResponse{
		ID: c.ID, Name: c.Name, MetaAdAccountID: c.MetaAdAccountID,
		MetaPageID: c.MetaPageID, MetaPixelID: c.MetaPixelID,
	}
}
