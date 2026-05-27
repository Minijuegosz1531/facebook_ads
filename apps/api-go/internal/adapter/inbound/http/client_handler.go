package http

import "net/http"

func (h *Handler) listClients(w http.ResponseWriter, r *http.Request) {
	clients, err := h.container.ClientRepo().ListAll(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	out := make([]clientResponse, 0, len(clients))
	for _, c := range clients {
		out = append(out, toClientResponse(c))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) getClient(w http.ResponseWriter, r *http.Request) {
	client, err := h.container.ClientRepo().Get(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toClientResponse(client))
}
