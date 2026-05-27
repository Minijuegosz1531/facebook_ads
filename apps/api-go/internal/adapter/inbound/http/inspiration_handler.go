package http

import (
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

	// Hand the heavy work to the configured enqueuer: a goroutine in-process
	// (dev) or a Redis/asynq task consumed by cmd/worker (production). Either
	// way the analyst gets an immediate 202 and polls the job for progress.
	if err := h.container.Enqueuer().EnqueueInspiration(r.Context(), cmd); err != nil {
		writeError(w, err)
		return
	}

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
