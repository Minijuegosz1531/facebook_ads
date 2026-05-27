package stub

import (
	"context"
	"fmt"
	"strings"

	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/domain/model"
)

// AdPromptBuilder assembles the text prompt sent to the image model.
//
// # Pattern: Builder (string assembly variant)
//
// Building a good prompt means combining several optional fragments (product,
// market, style hints distilled from reference ads). A builder makes the
// assembly explicit and each fragment independently testable, instead of one
// unreadable fmt.Sprintf. The real Higgsfield adapter would reuse this exact
// builder — only the transport differs between stub and real.
type AdPromptBuilder struct {
	product string
	country string
	style   string
}

func NewAdPromptBuilder() *AdPromptBuilder { return &AdPromptBuilder{} }

func (b *AdPromptBuilder) ForProduct(p string) *AdPromptBuilder { b.product = p; return b }

func (b *AdPromptBuilder) InMarket(country string) *AdPromptBuilder { b.country = country; return b }

// StyledAfter distills up to three reference ads into a short style hint.
func (b *AdPromptBuilder) StyledAfter(refs []model.ReferenceAd) *AdPromptBuilder {
	parts := make([]string, 0, 3)
	for i, ad := range refs {
		if i == 3 {
			break
		}
		body := ad.Body
		if len(body) > 100 {
			body = body[:100]
		}
		parts = append(parts, body)
	}
	b.style = strings.Join(parts, " ")
	return b
}

// Build returns the final prompt string.
func (b *AdPromptBuilder) Build() string {
	return fmt.Sprintf(
		"Professional Facebook/Instagram ad image. Product: %s. Market: %s Latin America. "+
			"High-contrast, clean background, product hero shot. Inspired by top-performing ads: %s. "+
			"No text overlays. Photorealistic.",
		b.product, b.country, b.style,
	)
}

// ImageGenerator is a fake port.ImageGenerator. It builds the prompt (to show
// the real flow) but returns ready-to-use placeholder image URLs instead of
// opaque request IDs, so the pipeline reaches "ready" without a webhook.
type ImageGenerator struct{}

func NewImageGenerator() *ImageGenerator { return &ImageGenerator{} }

func (ImageGenerator) Generate(_ context.Context, refs []model.ReferenceAd, product, country, _ string, count int) ([]string, error) {
	_ = NewAdPromptBuilder().ForProduct(product).InMarket(country).StyledAfter(refs).Build() // prompt the real adapter would send
	seed := strings.ReplaceAll(strings.ToLower(product), " ", "-")
	if seed == "" {
		seed = "ad"
	}
	urls := make([]string, 0, count)
	for i := 0; i < count; i++ {
		urls = append(urls, fmt.Sprintf("https://picsum.photos/seed/%s-%d/600/600", seed, i))
	}
	return urls, nil
}
