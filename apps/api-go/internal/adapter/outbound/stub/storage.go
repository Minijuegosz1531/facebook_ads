package stub

import "context"

// Storage is a fake port.Storage. Real GCS downloads the source and re-hosts it;
// the stub treats the source URL as already-permanent and returns it unchanged.
type Storage struct{}

func NewStorage() *Storage { return &Storage{} }

func (Storage) StoreFromURL(_ context.Context, sourceURL, _ string) (string, error) {
	return sourceURL, nil
}
