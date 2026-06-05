// Package crawler provides HTML scraping using goquery (replaces cheerio+axios).
package crawler

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/ssco/backend/internal/model"
)

const gsmArenaBase = "https://www.gsmarena.com"

// browserUA mimics a real browser to avoid being blocked by GSMArena.
const browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

type GadgetCrawler struct {
	client *http.Client
}

func NewGadgetCrawler() *GadgetCrawler {
	return &GadgetCrawler{
		// 15s timeout for full page crawl (specs pages are large)
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// SearchGSMArena returns gadgets matching keyword.
// Uses sQuickSearch=yes&sName= — same as the working Node.js implementation.
func (c *GadgetCrawler) SearchGSMArena(ctx context.Context, keyword string) ([]model.Gadget, error) {
	searchURL := fmt.Sprintf("%s/results.php3?sQuickSearch=yes&sName=%s", gsmArenaBase, url.QueryEscape(keyword))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, searchURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", browserUA)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Referer", "https://www.gsmarena.com/search.php3")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gsmarena search: %w", err)
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("gsmarena parse: %w", err)
	}

	gadgets := []model.Gadget{}

	// Try multiple selectors — same fallback order as Node.js implementation
	selectors := []string{".makers ul li", "#review-body ul li"}
	for _, sel := range selectors {
		if len(gadgets) > 0 {
			break
		}
		doc.Find(sel).Each(func(i int, s *goquery.Selection) {
			a := s.Find("a")
			href, _ := a.Attr("href")
			if href == "" {
				return
			}

			img, _ := a.Find("img").Attr("src")

			rawName := strings.TrimSpace(a.Find("strong").Text())
			if rawName == "" {
				rawName = strings.TrimSpace(a.Text())
			}
			rawName = strings.Join(strings.Fields(rawName), " ")

			// Derive brand from href slug (e.g. "apple_iphone_17-12345.php" → "Apple")
			brand := ""
			parts := strings.SplitN(href, "_", 2)
			if len(parts) > 0 && parts[0] != "" {
				b := parts[0]
				brand = strings.ToUpper(b[:1]) + b[1:]
			}

			pageURL := gsmArenaBase + "/" + href
			slug := strings.TrimSuffix(href, ".php")

			if rawName != "" && strings.Contains(pageURL, "gsmarena.com") {
				gadgets = append(gadgets, model.Gadget{
					Name:     rawName,
					Brand:    brand,
					Slug:     slug,
					Category: "smartphone",
					Images:   []string{img},
					Description: func() *string {
						s := pageURL
						return &s
					}(),
					IsActive: true,
				})
			}
		})
	}

	return gadgets, nil
}

// sectionMap mirrors the Node.js SECTION_MAP for consistent section keys.
var sectionMap = map[string]string{
	"Network": "network", "Launch": "launch", "Body": "body",
	"Display": "display", "Platform": "platform", "Memory": "memory",
	"Main Camera": "main_camera", "Selfie camera": "selfie_camera",
	"Sound": "sound", "Comms": "comms", "Features": "features",
	"Battery": "battery", "Misc": "misc", "Tests": "tests",
}

// CrawlGSMArena fetches full specs for a gadget page URL.
func (c *GadgetCrawler) CrawlGSMArena(ctx context.Context, pageURL string) (*model.Gadget, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", browserUA)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Referer", "https://www.gsmarena.com/")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gsmarena crawl: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("gsmarena read: %w", err)
	}
	log.Printf("[crawler] crawl %s → status=%d body=%d bytes", pageURL, resp.StatusCode, len(body))

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("gsmarena parse: %w", err)
	}

	name := strings.TrimSpace(doc.Find("h1.specs-phone-name-title").Text())
	if name == "" {
		name = strings.TrimSpace(doc.Find(".specs-phone-name-title, h1").First().Text())
	}

	img, _ := doc.Find(".specs-photo-main img").Attr("src")
	if img == "" {
		img, _ = doc.Find(".specs-photo-main a img").Attr("src")
	}

	// Group specs by section — same structure as Node.js (nested map)
	specs := map[string]any{}
	currentSection := "misc"
	doc.Find("#specs-list table").Each(func(_ int, table *goquery.Selection) {
		table.Find("tr").Each(func(_ int, row *goquery.Selection) {
			// Section heading row has <th>
			if th := row.Find("th"); th.Length() > 0 {
				heading := strings.TrimSpace(th.Text())
				if mapped, ok := sectionMap[heading]; ok {
					currentSection = mapped
				}
				if _, exists := specs[currentSection]; !exists {
					specs[currentSection] = map[string]string{}
				}
				return
			}
			label := strings.Join(strings.Fields(row.Find(".ttl").Text()), " ")
			value := strings.Join(strings.Fields(row.Find(".nfo").Text()), " ")
			if label == "" || value == "" || value == "-" {
				return
			}
			key := strings.ToLower(label)
			key = strings.NewReplacer(" ", "_", "/", "_", "(", "", ")", "").Replace(key)
			if _, exists := specs[currentSection]; !exists {
				specs[currentSection] = map[string]string{}
			}
			specs[currentSection].(map[string]string)[key] = value
		})
	})

	// Extract brand from misc or platform section
	brand := ""
	if misc, ok := specs["misc"].(map[string]string); ok {
		brand = misc["models"]
	}
	if brand == "" {
		doc.Find(".specs-phone-name-title").Each(func(_ int, s *goquery.Selection) {})
		// Try manufacturer from page title pattern "Brand Model - GSMArena"
		title := strings.TrimSpace(doc.Find("title").Text())
		if parts := strings.SplitN(title, " ", 2); len(parts) > 0 {
			brand = parts[0]
		}
	}

	// Detect category from device name
	nameLower := strings.ToLower(name)
	category := "smartphone"
	if strings.Contains(nameLower, "watch") || strings.Contains(nameLower, "band") {
		category = "smartwatch"
	} else if strings.Contains(nameLower, "tab") || strings.Contains(nameLower, "pad") || strings.Contains(nameLower, "fold") {
		category = "tablet"
	}

	return &model.Gadget{
		Name:           name,
		Brand:          brand,
		Category:       category,
		Specifications: specs,
		Images:         []string{img},
		IsActive:       true,
	}, nil
}
