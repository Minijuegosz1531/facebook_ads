package http

import (
	"net/http"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/infrastructure"
)

// Handler holds the dependencies shared by every HTTP endpoint. It depends on
// the Container (the composition root), from which it builds application
// services per request.
type Handler struct {
	container *infrastructure.Container
}

// NewHandler returns a Handler wired to the container.
func NewHandler(c *infrastructure.Container) *Handler {
	return &Handler{container: c}
}

// Routes builds the http.Handler with all endpoints registered.
//
// Go 1.22+ ServeMux understands "METHOD /path/{param}" patterns, so we get
// method-aware routing and typed path values (r.PathValue("id")) from the
// standard library — no third-party router needed.
func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", h.health)

	// Clients
	mux.HandleFunc("GET /clients", h.listClients)
	mux.HandleFunc("GET /clients/{id}", h.getClient)

	// Campaigns
	mux.HandleFunc("GET /campaigns", h.listCampaigns)
	mux.HandleFunc("POST /campaigns", h.createCampaign)
	mux.HandleFunc("POST /campaigns/publish-from-job", h.publishFromJob)
	mux.HandleFunc("GET /campaigns/{id}", h.getCampaign)
	mux.HandleFunc("PATCH /campaigns/{id}/status", h.updateStatus)
	mux.HandleFunc("GET /campaigns/{id}/insights", h.getInsights)
	mux.HandleFunc("DELETE /campaigns/{id}", h.deleteCampaign)

	// Inspiration
	mux.HandleFunc("POST /inspiration/search", h.startInspiration)
	mux.HandleFunc("GET /inspiration/{jobId}", h.getJob)

	// Webhooks
	mux.HandleFunc("POST /webhooks/higgsfield/{jobId}", h.higgsfieldWebhook)

	return withRecover(withLogging(mux))
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
