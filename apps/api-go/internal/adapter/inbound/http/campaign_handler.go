package http

import (
	"net/http"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

type createCampaignRequest struct {
	ClientID     string `json:"client_id"`
	AdAccountID  string `json:"ad_account_id"`
	Name         string `json:"name"`
	Objective    string `json:"objective"`
	BudgetType   string `json:"budget_type"`
	BudgetAmount int    `json:"budget_amount"`
	PageID       string `json:"page_id"`
	PixelID      string `json:"pixel_id"`
	ImageURL     string `json:"image_url"`
	Headline     string `json:"headline"`
	Body         string `json:"body"`
	CTA          string `json:"cta"`
	LinkURL      string `json:"link_url"`
}

type publishFromJobRequest struct {
	JobID        string `json:"job_id"`
	ClientID     string `json:"client_id"`
	AdAccountID  string `json:"ad_account_id"`
	Name         string `json:"name"`
	Objective    string `json:"objective"`
	BudgetType   string `json:"budget_type"`
	BudgetAmount int    `json:"budget_amount"`
	PageID       string `json:"page_id"`
	PixelID      string `json:"pixel_id"`
	LinkURL      string `json:"link_url"`
	ImageIndex   int    `json:"image_index"`
	CopyIndex    int    `json:"copy_index"`
}

type updateStatusRequest struct {
	Status string `json:"status"`
}

func (h *Handler) listCampaigns(w http.ResponseWriter, r *http.Request) {
	clientID := r.URL.Query().Get("client_id")
	if clientID == "" {
		writeJSON(w, http.StatusBadRequest, errorBody{Detail: "client_id is required"})
		return
	}
	svc := h.container.CampaignService("")
	campaigns, err := svc.ListByClient(r.Context(), clientID)
	if err != nil {
		writeError(w, err)
		return
	}
	out := make([]campaignResponse, 0, len(campaigns))
	for _, c := range campaigns {
		out = append(out, toCampaignResponse(c))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) createCampaign(w http.ResponseWriter, r *http.Request) {
	var req createCampaignRequest
	if err := decode(r, &req); err != nil {
		writeError(w, err)
		return
	}
	svc := h.container.CampaignService(req.AdAccountID)
	campaign, err := svc.Create(r.Context(), usecase.CreateCampaignCommand{
		ClientID:     req.ClientID,
		AdAccountID:  req.AdAccountID,
		Name:         req.Name,
		Objective:    req.Objective,
		BudgetType:   model.BudgetType(req.BudgetType),
		BudgetAmount: req.BudgetAmount,
		PageID:       req.PageID,
		PixelID:      req.PixelID,
		ImageURL:     req.ImageURL,
		Headline:     req.Headline,
		Body:         req.Body,
		CTA:          req.CTA,
		LinkURL:      req.LinkURL,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, toCampaignResponse(campaign))
}

func (h *Handler) publishFromJob(w http.ResponseWriter, r *http.Request) {
	var req publishFromJobRequest
	if err := decode(r, &req); err != nil {
		writeError(w, err)
		return
	}
	svc := h.container.CampaignService(req.AdAccountID)
	campaign, err := svc.PublishFromJob(r.Context(), usecase.SelectAndPublishCommand{
		JobID:        req.JobID,
		ClientID:     req.ClientID,
		AdAccountID:  req.AdAccountID,
		Name:         req.Name,
		Objective:    req.Objective,
		BudgetType:   model.BudgetType(req.BudgetType),
		BudgetAmount: req.BudgetAmount,
		PageID:       req.PageID,
		PixelID:      req.PixelID,
		LinkURL:      req.LinkURL,
		ImageIndex:   req.ImageIndex,
		CopyIndex:    req.CopyIndex,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, toCampaignResponse(campaign))
}

func (h *Handler) getCampaign(w http.ResponseWriter, r *http.Request) {
	svc := h.container.CampaignService("")
	campaign, err := svc.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toCampaignResponse(campaign))
}

func (h *Handler) updateStatus(w http.ResponseWriter, r *http.Request) {
	var req updateStatusRequest
	if err := decode(r, &req); err != nil {
		writeError(w, err)
		return
	}
	switch model.CampaignStatus(req.Status) {
	case model.StatusActive, model.StatusPaused, model.StatusArchived:
	default:
		writeJSON(w, http.StatusBadRequest, errorBody{Detail: "invalid status"})
		return
	}
	svc := h.container.CampaignService("")
	campaign, err := svc.UpdateStatus(r.Context(), r.PathValue("id"), model.CampaignStatus(req.Status))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toCampaignResponse(campaign))
}

func (h *Handler) getInsights(w http.ResponseWriter, r *http.Request) {
	since := queryDefault(r, "since", "2026-01-01")
	until := queryDefault(r, "until", "2026-12-31")
	svc := h.container.CampaignService("")
	insights, err := svc.Insights(r.Context(), r.PathValue("id"), since, until)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, insights)
}

func (h *Handler) deleteCampaign(w http.ResponseWriter, r *http.Request) {
	svc := h.container.CampaignService("")
	if err := svc.Delete(r.Context(), r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func queryDefault(r *http.Request, key, fallback string) string {
	if v := r.URL.Query().Get(key); v != "" {
		return v
	}
	return fallback
}
