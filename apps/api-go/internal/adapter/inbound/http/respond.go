package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
)

// writeJSON encodes v as JSON with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			slog.Error("encode response", "err", err)
		}
	}
}

// writeError maps a domain error to the right HTTP status and a JSON body.
//
// This is the single translation point between domain errors and HTTP — the
// handlers just return/propagate errors and call this. errors.Is sees through
// the fmt.Errorf("%w") wrapping done in the adapters and use cases.
func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, model.ErrNotFound):
		writeJSON(w, http.StatusNotFound, errorBody{Detail: err.Error()})
	case errors.Is(err, model.ErrValidation), errors.Is(err, model.ErrInvalidState):
		writeJSON(w, http.StatusBadRequest, errorBody{Detail: err.Error()})
	default:
		slog.Error("unhandled error", "err", err)
		writeJSON(w, http.StatusInternalServerError, errorBody{Detail: "internal error"})
	}
}

type errorBody struct {
	Detail string `json:"detail"`
}

// decode reads and validates a JSON request body into dst.
func decode(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return errors.Join(model.ErrValidation, err)
	}
	return nil
}
