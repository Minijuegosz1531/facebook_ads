package http_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	httpadapter "github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/adapter/inbound/http"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/config"
	"github.com/minijuegosz1531/facebook_ads/apps/api-go/internal/infrastructure"
)

// newTestServer spins up the full router backed by stub adapters.
func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	container := infrastructure.NewContainer(config.Config{UseStubs: true, BaseURL: "http://test"})
	srv := httptest.NewServer(httpadapter.NewHandler(container).Routes())
	t.Cleanup(srv.Close)
	return srv
}

func getJSON(t *testing.T, url string, out any) int {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer resp.Body.Close()
	decodeBody(t, resp.Body, out)
	return resp.StatusCode
}

func sendJSON(t *testing.T, method, url string, body any, out any) int {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	req, _ := http.NewRequest(method, url, &buf)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, url, err)
	}
	defer resp.Body.Close()
	decodeBody(t, resp.Body, out)
	return resp.StatusCode
}

func decodeBody(t *testing.T, r io.Reader, out any) {
	t.Helper()
	if out == nil {
		_, _ = io.Copy(io.Discard, r)
		return
	}
	if err := json.NewDecoder(r).Decode(out); err != nil && err != io.EOF {
		t.Fatalf("decode: %v", err)
	}
}

func TestHealth(t *testing.T) {
	srv := newTestServer(t)
	var body map[string]string
	if code := getJSON(t, srv.URL+"/health", &body); code != http.StatusOK {
		t.Fatalf("want 200, got %d", code)
	}
	if body["status"] != "ok" {
		t.Errorf("want ok, got %v", body)
	}
}

func TestFullFlow_InspirationToActivatedCampaign(t *testing.T) {
	srv := newTestServer(t)

	// clients
	var clients []map[string]any
	if code := getJSON(t, srv.URL+"/clients", &clients); code != http.StatusOK || len(clients) == 0 {
		t.Fatalf("clients: code=%d n=%d", code, len(clients))
	}
	client := clients[0]

	// start inspiration
	var job map[string]any
	code := sendJSON(t, http.MethodPost, srv.URL+"/inspiration/search", map[string]any{
		"client_id":   client["id"],
		"client_name": client["name"],
		"product":     "café de especialidad",
		"description": "Promocionar café de especialidad colombiano premium tostado",
		"objective":   "OUTCOME_SALES",
		"country":     "CO",
	}, &job)
	if code != http.StatusAccepted {
		t.Fatalf("start inspiration: want 202, got %d", code)
	}
	jobID, _ := job["job_id"].(string)

	// poll until ready (background goroutine)
	ready := false
	for i := 0; i < 50; i++ {
		var j map[string]any
		getJSON(t, srv.URL+"/inspiration/"+jobID, &j)
		if j["status"] == "ready" {
			imgs, _ := j["generated_images"].([]any)
			cps, _ := j["generated_copies"].([]any)
			if len(imgs) != 5 || len(cps) != 10 {
				t.Fatalf("want 5 imgs/10 copies, got %d/%d", len(imgs), len(cps))
			}
			ready = true
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if !ready {
		t.Fatal("inspiration job never became ready")
	}

	// publish
	var campaign map[string]any
	code = sendJSON(t, http.MethodPost, srv.URL+"/campaigns/publish-from-job", map[string]any{
		"job_id":        jobID,
		"client_id":     client["id"],
		"ad_account_id": client["meta_ad_account_id"],
		"name":          "Campaña Café Premium",
		"objective":     "OUTCOME_SALES",
		"budget_type":   "campaign",
		"budget_amount": 5000,
		"page_id":       client["meta_page_id"],
		"link_url":      "https://shop.example/cafe",
		"image_index":   0,
		"copy_index":    2,
	}, &campaign)
	if code != http.StatusCreated {
		t.Fatalf("publish: want 201, got %d", code)
	}
	if campaign["status"] != "PAUSED" {
		t.Errorf("want PAUSED, got %v", campaign["status"])
	}
	campaignID, _ := campaign["id"].(string)

	// activate
	var activated map[string]any
	code = sendJSON(t, http.MethodPatch, srv.URL+"/campaigns/"+campaignID+"/status",
		map[string]any{"status": "ACTIVE"}, &activated)
	if code != http.StatusOK || activated["status"] != "ACTIVE" {
		t.Fatalf("activate: code=%d status=%v", code, activated["status"])
	}

	// insights
	var insights map[string]any
	if code := getJSON(t, srv.URL+"/campaigns/"+campaignID+"/insights", &insights); code != http.StatusOK {
		t.Fatalf("insights: want 200, got %d", code)
	}
	if _, ok := insights["data"]; !ok {
		t.Errorf("want data in insights, got %v", insights)
	}
}
