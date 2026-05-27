package usecase_test

import (
	"context"
	"testing"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/outbound/stub"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/usecase"
)

// The use case is unit-testable with the stub adapters standing in for the real
// ports — no HTTP, no database, no Meta CLI. That is the payoff of hexagonal.
func TestCreateCampaign_PersistsPausedCampaignWithMetaIDs(t *testing.T) {
	repo := stub.NewInMemoryCampaignRepository()
	uc := usecase.NewCreateCampaignUseCase(stub.NewAdPlatform(), repo)

	got, err := uc.Execute(context.Background(), usecase.CreateCampaignCommand{
		ClientID:     "client-1",
		Name:         "Lanzamiento Verano",
		Objective:    "OUTCOME_SALES",
		BudgetType:   model.BudgetCampaign,
		BudgetAmount: 5000,
		PageID:       "page_1",
		ImageURL:     "https://img/1.jpg",
		Headline:     "Compra ya",
		Body:         "La mejor oferta",
		CTA:          "SHOP_NOW",
		LinkURL:      "https://shop.example/p",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.ID == "" {
		t.Error("want a generated ID, got empty")
	}
	if got.Status != model.StatusPaused {
		t.Errorf("want PAUSED, got %s", got.Status)
	}
	if got.MetaCampaignID == "" || got.MetaAdsetID == "" || got.MetaAdID == "" || got.MetaCreativeID == "" {
		t.Errorf("want all meta IDs populated, got %+v", got)
	}
	if len(got.Ads) != 1 {
		t.Fatalf("want 1 ad, got %d", len(got.Ads))
	}

	// And it was persisted.
	stored, err := repo.Get(context.Background(), got.ID)
	if err != nil {
		t.Fatalf("expected campaign to be stored: %v", err)
	}
	if stored.Name != "Lanzamiento Verano" {
		t.Errorf("stored name mismatch: %s", stored.Name)
	}
}

func TestCampaignBuilder_FailsWithoutRequiredFields(t *testing.T) {
	_, err := model.NewCampaignBuilder().WithName("x").Build() // missing client + objective
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
}
