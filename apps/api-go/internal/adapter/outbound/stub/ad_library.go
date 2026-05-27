package stub

import (
	"context"
	"fmt"
	"strings"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
)

// AdLibrary is a fake port.AdLibrary returning synthetic reference ads.
type AdLibrary struct{}

func NewAdLibrary() *AdLibrary { return &AdLibrary{} }

func (AdLibrary) SearchTopAds(_ context.Context, keywords []string, _ string, _ []string, limit int) ([]model.ReferenceAd, error) {
	kw := strings.Join(keywords, " ")
	if kw == "" {
		kw = "producto"
	}
	out := make([]model.ReferenceAd, 0, limit)
	for i := 0; i < limit; i++ {
		out = append(out, model.ReferenceAd{
			Body:        fmt.Sprintf("Descubre %s — oferta por tiempo limitado #%d", kw, i+1),
			Title:       fmt.Sprintf("Anuncio %s %d", kw, i+1),
			SnapshotURL: fmt.Sprintf("https://facebook.com/ads/library/?id=stub%d", i),
			Impressions: 100000 - i*7500,
		})
	}
	return out, nil
}
