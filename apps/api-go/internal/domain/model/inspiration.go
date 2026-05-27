package model

import "time"

// JobStatus tracks the AI inspiration pipeline lifecycle.
type JobStatus string

const (
	JobPending    JobStatus = "pending"
	JobSearching  JobStatus = "searching"
	JobGenerating JobStatus = "generating"
	JobReady      JobStatus = "ready"
	JobFailed     JobStatus = "failed"
)

type ReferenceAd struct {
	Body        string
	Title       string
	SnapshotURL string
	Impressions int
}

type GeneratedImage struct {
	URL       string
	RequestID string
}

type Copy struct {
	Headline string
	Body     string
	CTA      string
}

type GeneratedAssets struct {
	Images []GeneratedImage
	Copies []Copy
}

type InspirationJob struct {
	ID                   string
	ClientID             string
	Keywords             []string
	Country              string
	Platforms            []string
	Status               JobStatus
	ReferenceAds         []ReferenceAd
	Assets               GeneratedAssets
	HiggsfieldRequestIDs []string
	Error                string
	CreatedAt            time.Time
}
