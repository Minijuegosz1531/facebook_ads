package usecase

import (
	"context"
	"fmt"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
)

// AttachImageUseCase handles a Higgsfield webhook callback: it persists the
// finished image to permanent storage (Higgsfield URLs expire in 7 days) and
// attaches it to the job, flipping the job to ready once all assets are in.
type AttachImageUseCase struct {
	storage  port.Storage
	jobStore port.JobStore
}

func NewAttachImageUseCase(storage port.Storage, jobStore port.JobStore) *AttachImageUseCase {
	return &AttachImageUseCase{storage: storage, jobStore: jobStore}
}

// Execute stores the image and updates the job. It is idempotent enough for the
// stub: a missing job is reported via ErrNotFound.
func (uc *AttachImageUseCase) Execute(ctx context.Context, jobID, requestID, imageURL string) error {
	job, err := uc.jobStore.Get(ctx, jobID)
	if err != nil {
		return err
	}
	destKey := fmt.Sprintf("inspiration/%s/%s.jpg", jobID, requestID)
	permanentURL, err := uc.storage.StoreFromURL(ctx, imageURL, destKey)
	if err != nil {
		return fmt.Errorf("store image: %w", err)
	}
	job.Assets.Images = append(job.Assets.Images, model.GeneratedImage{URL: permanentURL, RequestID: requestID})
	if len(job.Assets.Images) >= len(job.HiggsfieldRequestIDs) && len(job.Assets.Copies) > 0 {
		job.Status = model.JobReady
	}
	return uc.jobStore.Save(ctx, job)
}
