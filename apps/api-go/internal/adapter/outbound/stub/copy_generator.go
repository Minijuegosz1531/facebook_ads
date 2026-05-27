package stub

import (
	"context"
	"fmt"
	"strings"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
)

// CopyGenerator is a fake port.CopyGenerator producing deterministic keywords
// and copy without calling Claude.
type CopyGenerator struct{}

func NewCopyGenerator() *CopyGenerator { return &CopyGenerator{} }

func (CopyGenerator) ExtractKeywords(_ context.Context, description string) ([]string, error) {
	var kw []string
	for _, w := range strings.Fields(description) {
		w = strings.ToLower(strings.Trim(w, ".,;:!¡¿?"))
		if len(w) > 4 {
			kw = append(kw, w)
		}
		if len(kw) == 5 {
			break
		}
	}
	if len(kw) == 0 {
		kw = []string{"producto", "oferta", "calidad"}
	}
	return kw, nil
}

func (CopyGenerator) GenerateCopies(_ context.Context, _ []model.ReferenceAd, clientName, product, _, country string, count int) ([]model.Copy, error) {
	ctas := []string{"SHOP_NOW", "LEARN_MORE", "SIGN_UP", "GET_OFFER"}
	out := make([]model.Copy, 0, count)
	for i := 0; i < count; i++ {
		out = append(out, model.Copy{
			Headline: fmt.Sprintf("%s para %s — opción %d", product, country, i+1),
			Body:     fmt.Sprintf("%s: lo que buscabas en %s. ¡Aprovecha hoy!", clientName, product),
			CTA:      ctas[i%len(ctas)],
		})
	}
	return out, nil
}
