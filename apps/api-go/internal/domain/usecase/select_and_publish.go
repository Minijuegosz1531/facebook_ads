package usecase

import (
	"context"
	"fmt"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/port"
)

// SelectAndPublishCommand carries the analyst's chosen image+copy plus the
// campaign settings needed to publish.
type SelectAndPublishCommand struct {
	JobID        string
	ClientID     string
	AdAccountID  string
	Name         string
	Objective    string
	BudgetType   model.BudgetType
	BudgetAmount int
	PageID       string
	PixelID      string
	LinkURL      string
	ImageIndex   int
	CopyIndex    int
}

// SelectAssetsAndPublishUseCase turns a finished inspiration job + a selection
// into a published campaign. It demonstrates composition: it reuses
// CreateCampaignUseCase rather than duplicating the publish logic.
type SelectAssetsAndPublishUseCase struct {
	jobStore       port.JobStore
	createCampaign *CreateCampaignUseCase
}

func NewSelectAssetsAndPublishUseCase(jobStore port.JobStore, createCampaign *CreateCampaignUseCase) *SelectAssetsAndPublishUseCase {
	return &SelectAssetsAndPublishUseCase{jobStore: jobStore, createCampaign: createCampaign}
}

// Execute validates the selection, then delegates to CreateCampaignUseCase.
func (uc *SelectAssetsAndPublishUseCase) Execute(ctx context.Context, cmd SelectAndPublishCommand) (model.Campaign, error) {
	job, err := uc.jobStore.Get(ctx, cmd.JobID)
	if err != nil {
		return model.Campaign{}, err
	}
	if job.Status != model.JobReady {
		return model.Campaign{}, fmt.Errorf("%w: job %s is %s, not ready", model.ErrInvalidState, cmd.JobID, job.Status)
	}
	if cmd.ImageIndex < 0 || cmd.ImageIndex >= len(job.Assets.Images) {
		return model.Campaign{}, fmt.Errorf("%w: image index out of range", model.ErrValidation)
	}
	if cmd.CopyIndex < 0 || cmd.CopyIndex >= len(job.Assets.Copies) {
		return model.Campaign{}, fmt.Errorf("%w: copy index out of range", model.ErrValidation)
	}

	img := job.Assets.Images[cmd.ImageIndex]
	cp := job.Assets.Copies[cmd.CopyIndex]

	return uc.createCampaign.Execute(ctx, CreateCampaignCommand{
		ClientID:     cmd.ClientID,
		AdAccountID:  cmd.AdAccountID,
		Name:         cmd.Name,
		Objective:    cmd.Objective,
		BudgetType:   cmd.BudgetType,
		BudgetAmount: cmd.BudgetAmount,
		PageID:       cmd.PageID,
		PixelID:      cmd.PixelID,
		ImageURL:     img.URL,
		Headline:     cp.Headline,
		Body:         cp.Body,
		CTA:          cp.CTA,
		LinkURL:      cmd.LinkURL,
	})
}
