package http

import "net/http"

type higgsfieldCallback struct {
	RequestID string `json:"request_id"`
	ImageURL  string `json:"image_url"`
	Status    string `json:"status"`
}

// higgsfieldWebhook is called by Higgsfield when an image finishes rendering.
func (h *Handler) higgsfieldWebhook(w http.ResponseWriter, r *http.Request) {
	var cb higgsfieldCallback
	if err := decode(r, &cb); err != nil {
		writeError(w, err)
		return
	}
	svc := h.container.InspirationService()
	if err := svc.AttachImage(r.Context(), r.PathValue("jobId"), cb.RequestID, cb.ImageURL); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
