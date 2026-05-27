package usecase_test

import (
	"context"
	"testing"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/outbound/stub"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

func TestGenerateInspiration_ProducesReadyJob(t *testing.T) {
	jobStore := stub.NewInMemoryJobStore()
	uc := usecase.NewGenerateInspirationUseCase(
		stub.NewAdLibrary(), stub.NewImageGenerator(), stub.NewCopyGenerator(), jobStore,
	)

	job, err := uc.Execute(context.Background(), usecase.GenerateInspirationCommand{
		JobID:          "job-1",
		ClientID:       "client-1",
		ClientName:     "Cafetería Andina",
		Product:        "café de especialidad",
		Description:    "Campaña para promocionar café de especialidad colombiano premium",
		Objective:      "OUTCOME_SALES",
		Country:        "CO",
		WebhookBaseURL: "http://localhost:8080",
		ImageCount:     5,
		CopyCount:      10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if job.Status != model.JobReady {
		t.Errorf("want ready, got %s", job.Status)
	}
	if len(job.Assets.Images) != 5 {
		t.Errorf("want 5 images, got %d", len(job.Assets.Images))
	}
	if len(job.Assets.Copies) != 10 {
		t.Errorf("want 10 copies, got %d", len(job.Assets.Copies))
	}
	if len(job.Keywords) == 0 {
		t.Error("want keywords extracted")
	}
}
