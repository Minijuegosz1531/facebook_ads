package model

// Client is an advertiser whose ad account lives under the shared Business Manager.
type Client struct {
	ID              string
	Name            string
	MetaAdAccountID string // act_123456789
	MetaPageID      string
	MetaPixelID     string
}
