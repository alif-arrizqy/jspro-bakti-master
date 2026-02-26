package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"trouble-ticket-services/internal/cache"
	"trouble-ticket-services/internal/config"
)

var httpClient = &http.Client{
	Timeout: 10 * time.Second,
}

// ContactPersonItem represents a contact person entry from sites-services
type ContactPersonItem struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

// SiteData represents data extracted from sites-services response
type SiteData struct {
	SiteID         string              `json:"siteId"`
	PrCode         *string             `json:"prCode"`
	SiteName       string              `json:"siteName"`
	BatteryVersion string              `json:"batteryVersion"`
	Province       string              `json:"province"`
	ContactPerson  []ContactPersonItem `json:"contactPerson"`
}

// internal structs for parsing sites-services response
type siteDetail struct {
	Province      string              `json:"province"`
	ContactPerson []ContactPersonItem `json:"contactPerson"`
}

type siteResponseData struct {
	SiteID         string     `json:"siteId"`
	PrCode         *string    `json:"prCode"`
	SiteName       string     `json:"siteName"`
	BatteryVersion string     `json:"batteryVersion"`
	Detail         siteDetail `json:"detail"`
}

type siteResponse struct {
	Success bool             `json:"success"`
	Message string           `json:"message"`
	Data    siteResponseData `json:"data"`
}

// internal structs for parsing sla-services response
// Response shape:
// { "data": { "summary": { "slaAverage": 87.89, "slaUnit": "%" },
//
//	"sites": [{ "siteId": "X", "siteSla": { "slaAverage": 0, "slaUnit": "%" } }] } }
type slaSummary struct {
	SlaAverage float64 `json:"slaAverage"`
	SlaUnit    string  `json:"slaUnit"`
}

type siteSlaData struct {
	SlaAverage float64 `json:"slaAverage"`
	SlaUnit    string  `json:"slaUnit"`
	SlaStatus  string  `json:"slaStatus"`
}

type slaItem struct {
	SiteID  string      `json:"siteId"`
	SiteSla siteSlaData `json:"siteSla"`
}

type slaResponseData struct {
	Summary slaSummary `json:"summary"`
	Sites   []slaItem  `json:"sites"`
}

type slaResponse struct {
	Success bool            `json:"success"`
	Data    slaResponseData `json:"data"`
}

// slaCacheEntry is used to cache both slaAverage and slaUnit together
type slaCacheEntry struct {
	Average float64 `json:"average"`
	Unit    string  `json:"unit"`
}

type siteSearchDetailItem struct {
	Province string `json:"province"`
}

type siteSearchResponseItem struct {
	SiteID   string               `json:"siteId"`
	SiteName string               `json:"siteName"`
	Detail   siteSearchDetailItem `json:"detail"`
}

type siteSearchResponsePayload struct {
	Data []siteSearchResponseItem `json:"data"`
}

type siteSearchResponse struct {
	Success bool                      `json:"success"`
	Data    siteSearchResponsePayload `json:"data"`
}

// GetSiteByID fetches a single site from sites-services with Redis caching.
// Cache key: tt:site:{siteId}, TTL: 1 hour
// Endpoint: GET /api/v1/sites/:siteId
func GetSiteByID(siteID string) (*SiteData, error) {
	ctx := context.Background()
	cacheKey := fmt.Sprintf("tt:site:%s", siteID)

	var cached SiteData
	if cache.Get(ctx, cacheKey, &cached) {
		return &cached, nil
	}

	url := fmt.Sprintf("%s/api/v1/sites/%s", config.App.External.SitesServiceURL, siteID)

	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to call sites-services: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read sites-services response: %w", err)
	}

	var result siteResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse sites-services response: %w", err)
	}

	if !result.Success {
		return nil, fmt.Errorf("sites-services returned error for siteId: %s", siteID)
	}

	site := &SiteData{
		SiteID:         result.Data.SiteID,
		PrCode:         result.Data.PrCode,
		SiteName:       result.Data.SiteName,
		BatteryVersion: result.Data.BatteryVersion,
		Province:       result.Data.Detail.Province,
		ContactPerson:  result.Data.Detail.ContactPerson,
	}

	if site.ContactPerson == nil {
		site.ContactPerson = []ContactPersonItem{}
	}

	cache.Set(ctx, cacheKey, *site, time.Hour)

	return site, nil
}

// SearchSites searches for sites by name/id in sites-services.
// Endpoint: GET /api/v1/sites?search={query}&limit=100
func SearchSites(query string) ([]string, error) {
	if query == "" {
		return []string{}, nil
	}

	params := url.Values{}
	params.Set("search", query)
	params.Set("limit", "100")
	apiURL := fmt.Sprintf("%s/api/v1/sites?%s", config.App.External.SitesServiceURL, params.Encode())

	resp, err := httpClient.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("failed to call sites-services for search: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read sites-services search response: %w", err)
	}

	var result siteSearchResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse sites-services search response: %w", err)
	}

	if !result.Success {
		return nil, fmt.Errorf("sites-services search returned success=false")
	}

	siteIDs := make([]string, len(result.Data.Data))
	for i, s := range result.Data.Data {
		siteIDs[i] = s.SiteID
	}

	return siteIDs, nil
}

// SearchSitesByProvince searches for site IDs belonging to a given province.
// Endpoint: GET /api/v1/sites?province={province}&limit=500
func SearchSitesByProvince(province string) ([]string, error) {
	if province == "" {
		return []string{}, nil
	}

	params := url.Values{}
	params.Set("province", province)
	params.Set("limit", "100")
	apiURL := fmt.Sprintf("%s/api/v1/sites?%s", config.App.External.SitesServiceURL, params.Encode())

	resp, err := httpClient.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("failed to call sites-services for province search: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read sites-services province response: %w", err)
	}

	var result siteSearchResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse sites-services province response: %w", err)
	}

	if !result.Success {
		return nil, fmt.Errorf("sites-services province search returned success=false")
	}

	// Exact-match filter: sites-service may return over-broad results
	// (e.g. "maluku" region key returns MALUKU+MALUKU UTARA, or "contains"
	// match for "PAPUA BARAT" also hits "PAPUA BARAT DAYA").
	// Compare against the normalised uppercase province name to ensure
	// only the requested province is included.
	wantProvince := strings.ToUpper(strings.TrimSpace(province))
	siteIDs := make([]string, 0, len(result.Data.Data))
	for _, s := range result.Data.Data {
		if strings.ToUpper(strings.TrimSpace(s.Detail.Province)) == wantProvince {
			siteIDs = append(siteIDs, s.SiteID)
		}
	}

	return siteIDs, nil
}

// SlaResult holds slaAverage and slaUnit for a site
type SlaResult struct {
	Average float64
	Unit    string
}

// BuildSiteMap fetches site data for multiple siteIds.
// Returns a map of siteId -> SiteData
func BuildSiteMap(siteIDs []string) (map[string]SiteData, error) {
	siteMap := make(map[string]SiteData, len(siteIDs))

	for _, siteID := range siteIDs {
		site, err := GetSiteByID(siteID)
		if err != nil {
			// continue — one failed site should not block the rest
			continue
		}
		siteMap[siteID] = *site
	}

	return siteMap, nil
}

// BuildSlaMap fetches SLA data for multiple siteIds for the given date range.
// Returns a map of siteId -> SlaResult
func BuildSlaMap(siteIDs []string, startDate, endDate string) map[string]SlaResult {
	slaMap := make(map[string]SlaResult, len(siteIDs))
	for _, siteID := range siteIDs {
		avg, unit, err := GetSlaForSite(siteID, startDate, endDate)
		if err != nil {
			continue
		}
		slaMap[siteID] = SlaResult{Average: avg, Unit: unit}
	}
	return slaMap
}

// GetSlaForSite fetches SLA average and unit for a specific siteId within a date range.
// Reads from data.sites[0].siteSla.slaAverage and slaUnit.
// Cache key: tt:sla:{siteId}:{startDate}:{endDate}, TTL: 30 minutes
// Endpoint: GET /api/v1/sla-bakti/master?startDate=...&endDate=...&siteId=...
func GetSlaForSite(siteID string, startDate, endDate string) (slaAverage float64, slaUnit string, err error) {
	ctx := context.Background()
	cacheKey := fmt.Sprintf("tt:sla:%s:%s:%s", siteID, startDate, endDate)

	var cached slaCacheEntry
	if cache.Get(ctx, cacheKey, &cached) {
		return cached.Average, cached.Unit, nil
	}

	url := fmt.Sprintf("%s/api/v1/sla-bakti/master?startDate=%s&endDate=%s&siteId=%s",
		config.App.External.SlaServiceURL, startDate, endDate, siteID)

	resp, err := httpClient.Get(url)
	if err != nil {
		return 0, "", fmt.Errorf("failed to call sla-services: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, "", fmt.Errorf("failed to read sla-services response: %w", err)
	}

	var result slaResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, "", fmt.Errorf("failed to parse sla-services response: %w", err)
	}

	if !result.Success {
		return 0, "", fmt.Errorf("sla-services returned error for siteId: %s", siteID)
	}

	// Extract from data.sites[0].siteSla (per-site SLA)
	if len(result.Data.Sites) > 0 {
		siteSla := result.Data.Sites[0].SiteSla
		entry := slaCacheEntry{Average: siteSla.SlaAverage, Unit: siteSla.SlaUnit}
		cache.Set(ctx, cacheKey, entry, 30*time.Minute)
		return siteSla.SlaAverage, siteSla.SlaUnit, nil
	}

	// Fallback to summary if sites array is empty
	summary := result.Data.Summary
	entry := slaCacheEntry{Average: summary.SlaAverage, Unit: summary.SlaUnit}
	cache.Set(ctx, cacheKey, entry, 30*time.Minute)
	return summary.SlaAverage, summary.SlaUnit, nil
}
