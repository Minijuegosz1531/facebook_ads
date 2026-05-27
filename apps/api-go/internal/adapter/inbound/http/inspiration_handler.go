package http

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

type startInspirationRequest struct {
	ClientID    string   `json:"client_id"`
	ClientName  string   `json:"client_name"`
	Product     string   `json:"product"`
	Description string   `json:"description"`
	Objective   string   `json:"objective"`
	Country     string   `json:"country"`
	Platforms   []string `json:"platforms"`
	ImageCount  int      `json:"image_count"`
	CopyCount   int      `json:"copy_count"`
}

func (h *Handler) startInspiration(w http.ResponseWriter, r *http.Request) {
	var req startInspirationRequest
	if err := decode(r, &req); err != nil {
		writeError(w, err)
		return
	}
	if len(req.Platforms) == 0 {
		req.Platforms = []string{"facebook", "instagram"}
	}
	if req.ImageCount == 0 {
		req.ImageCount = 5
	}
	if req.CopyCount == 0 {
		req.CopyCount = 10
	}

	svc := h.container.InspirationService()
	cmd := usecase.GenerateInspirationCommand{
		JobID:          newJobID(),
		ClientID:       req.ClientID,
		ClientName:     req.ClientName,
		Product:        req.Product,
		Description:    req.Description,
		Objective:      req.Objective,
		Country:        req.Country,
		Platforms:      req.Platforms,
		ImageCount:     req.ImageCount,
		CopyCount:      req.CopyCount,
		WebhookBaseURL: h.container.Cfg.BaseURL,
	}

	job, err := svc.Start(r.Context(), cmd)
	if err != nil {
		writeError(w, err)
		return
	}

	// Run the heavy pipeline in the background. We use context.Background()
	// (NOT r.Context()) because the request context is cancelled as soon as we
	// return the 202 below — using it would cancel the pipeline immediately.
	// In production this enqueues an arq/Redis job instead of a goroutine.
	go func() {
		if _, err := svc.RunCommand(context.Background(), cmd); err != nil {
			// The error is already recorded on the job (status=failed); the
			// frontend sees it via polling.
			_ = err
		}
	}()

	writeJSON(w, http.StatusAccepted, toJobResponse(job))
}

func (h *Handler) getJob(w http.ResponseWriter, r *http.Request) {
	svc := h.container.InspirationService()
	job, err := svc.Get(r.Context(), r.PathValue("jobId"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toJobResponse(job))
}

// newJobID returns a random hex id for a job.
func newJobID() string {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return "job_" + hex.EncodeToString(b[:])
}
