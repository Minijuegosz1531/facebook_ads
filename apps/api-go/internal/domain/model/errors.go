package model

import "errors"

// Sentinel errors of the domain. Callers compare with errors.Is(err, ErrNotFound)
// rather than matching on strings. Adapters wrap these with %w so the original
// sentinel stays detectable up the call stack, e.g.:
//
//	return model.Campaign{}, fmt.Errorf("repo get %q: %w", id, model.ErrNotFound)
//
// and the HTTP layer maps ErrNotFound -> 404, ErrInvalidState/ErrValidation -> 400.
var (
	// ErrNotFound is returned when a requested entity does not exist.
	ErrNotFound = errors.New("not found")
	// ErrInvalidState is returned when an operation is not allowed for the
	// entity's current state (e.g. publishing from a job that isn't ready).
	ErrInvalidState = errors.New("invalid state")
	// ErrValidation signals invalid input that the domain refuses to act on.
	ErrValidation = errors.New("validation error")
	// ErrAdPlatform wraps failures coming from the advertising platform.
	ErrAdPlatform = errors.New("ad platform error")
)
