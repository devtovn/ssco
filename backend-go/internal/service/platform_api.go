package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/ssco/backend/internal/model"
)

const browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

type PlatformAPIService struct {
	client *http.Client
}

func NewPlatformAPIService() *PlatformAPIService {
	return &PlatformAPIService{
		client: &http.Client{Timeout: 8 * time.Second},
	}
}

// SearchTiki searches Tiki without an API key.
func (s *PlatformAPIService) SearchTiki(ctx context.Context, keyword string, limit int) ([]model.NormalizedProduct, error) {
	apiURL := fmt.Sprintf("https://tiki.vn/api/v2/products?q=%s&limit=%d", url.QueryEscape(keyword), limit)

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	req.Header.Set("User-Agent", browserUA)
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tiki search: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data []struct {
			ID            int     `json:"id"`
			Name          string  `json:"name"`
			Price         float64 `json:"price"`
			ThumbnailURL  string  `json:"thumbnail_url"`
			URL           string  `json:"url_path"`
			BrandName     string  `json:"brand_name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("tiki parse: %w", err)
	}

	products := make([]model.NormalizedProduct, 0, len(result.Data))
	for _, item := range result.Data {
		brand := item.BrandName
		p := model.NormalizedProduct{
			ExternalID:  fmt.Sprintf("%d", item.ID),
			Name:        item.Name,
			Brand:       &brand,
			Price:       item.Price,
			Currency:    "VND",
			IsAvailable: true,
			Images:      []string{item.ThumbnailURL},
			SourceURL:   "https://tiki.vn/" + item.URL,
			Source:      "tiki",
		}
		products = append(products, p)
	}
	return products, nil
}

// SearchShopee searches Shopee without an API key.
func (s *PlatformAPIService) SearchShopee(ctx context.Context, keyword string, limit int) ([]model.NormalizedProduct, error) {
	apiURL := fmt.Sprintf(
		"https://shopee.vn/api/v4/search/search_items?by=relevancy&keyword=%s&limit=%d&newest=0&order=desc&page_type=search",
		url.QueryEscape(keyword), limit)

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	req.Header.Set("User-Agent", browserUA)
	req.Header.Set("Referer", "https://shopee.vn/")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("shopee search: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Items []struct {
			ItemBasic struct {
				ItemID   int64   `json:"itemid"`
				ShopID   int64   `json:"shopid"`
				Name     string  `json:"name"`
				Price    float64 `json:"price"`
				Images   []string `json:"images"`
			} `json:"item_basic"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("shopee parse: %w", err)
	}

	products := make([]model.NormalizedProduct, 0, len(result.Items))
	for _, item := range result.Items {
		b := item.ItemBasic
		var images []string
		for _, img := range b.Images {
			images = append(images, "https://cf.shopee.vn/file/"+img)
		}
		p := model.NormalizedProduct{
			ExternalID:  fmt.Sprintf("%d_%d", b.ShopID, b.ItemID),
			Name:        b.Name,
			Price:       b.Price / 100000, // Shopee price is in 1/100000 VND
			Currency:    "VND",
			IsAvailable: true,
			Images:      images,
			SourceURL:   fmt.Sprintf("https://shopee.vn/product/%d/%d", b.ShopID, b.ItemID),
			Source:      "shopee",
		}
		products = append(products, p)
	}
	return products, nil
}

// SearchAll queries all platforms concurrently.
func (s *PlatformAPIService) SearchAll(ctx context.Context, keyword string, limit int) map[string][]model.NormalizedProduct {
	type result struct {
		platform string
		products []model.NormalizedProduct
	}
	ch := make(chan result, 2)

	go func() {
		prods, _ := s.SearchTiki(ctx, keyword, limit)
		ch <- result{"tiki", prods}
	}()
	go func() {
		prods, _ := s.SearchShopee(ctx, keyword, limit)
		ch <- result{"shopee", prods}
	}()

	out := make(map[string][]model.NormalizedProduct)
	for range 2 {
		r := <-ch
		out[r.platform] = r.products
	}
	return out
}
