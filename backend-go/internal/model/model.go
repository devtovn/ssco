package model

import "time"

// ── Product & Price ──────────────────────────────────────────────────────────

type Product struct {
	ID             string         `json:"id" db:"id"`
	Name           string         `json:"name" db:"name"`
	Slug           string         `json:"slug" db:"slug"`
	Description    *string        `json:"description,omitempty" db:"description"`
	Category       string         `json:"category" db:"category"`
	Brand          *string        `json:"brand,omitempty" db:"brand"`
	Model          *string        `json:"model,omitempty" db:"model"`
	Specifications map[string]any `json:"specifications,omitempty" db:"specifications"`
	Images         []string       `json:"images,omitempty" db:"images"`
	Keywords       []string       `json:"keywords,omitempty" db:"keywords"`
	IsActive       bool           `json:"isActive" db:"is_active"`
	HiddenSources  []string       `json:"hiddenSources,omitempty" db:"hidden_sources"`
	SourceType     string         `json:"sourceType" db:"source_type"`
	CreatedAt      time.Time      `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time      `json:"updatedAt" db:"updated_at"`
}

type PriceEntry struct {
	ID          string         `json:"id" db:"id"`
	ProductID   string         `json:"productId" db:"product_id"`
	SourceName  string         `json:"sourceName" db:"source_name"`
	SourceURL   string         `json:"sourceUrl" db:"source_url"`
	AffiliateURL *string       `json:"affiliateUrl,omitempty" db:"affiliate_url"`
	Price       float64        `json:"price" db:"price"`
	Currency    string         `json:"currency" db:"currency"`
	IsAvailable bool           `json:"isAvailable" db:"is_available"`
	Metadata    map[string]any `json:"metadata,omitempty" db:"metadata"`
	ScrapedAt   time.Time      `json:"scrapedAt" db:"scraped_at"`
	CreatedAt   time.Time      `json:"createdAt" db:"created_at"`
}

type PriceComparison struct {
	ProductID    string       `json:"productId"`
	ProductName  string       `json:"productName"`
	ProductSlug  string       `json:"productSlug"`
	Prices       []PriceEntry `json:"prices"`
	LowestPrice  float64      `json:"lowestPrice"`
	HighestPrice float64      `json:"highestPrice"`
	LastUpdated  time.Time    `json:"lastUpdated"`
}

type PriceHistory struct {
	ProductID string        `json:"productId"`
	Source    string        `json:"source"`
	Points    []PricePoint  `json:"points"`
}

type PricePoint struct {
	Price     float64   `json:"price"`
	ScrapedAt time.Time `json:"scrapedAt"`
}

type Deal struct {
	ProductID       string    `json:"productId"`
	ProductName     string    `json:"productName"`
	ProductSlug     string    `json:"productSlug"`
	Images          []string  `json:"images"`
	CurrentPrice    float64   `json:"currentPrice"`
	OriginalPrice   float64   `json:"originalPrice"`
	DiscountPercent float64   `json:"discountPercent"`
	SourceName      string    `json:"sourceName"`
	SourceURL       string    `json:"sourceUrl"`
	AffiliateURL    *string   `json:"affiliateUrl,omitempty"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// ── Category ─────────────────────────────────────────────────────────────────

type Category struct {
	ID           string     `json:"id" db:"id"`
	Name         string     `json:"name" db:"name_vi"`   // DB column: name_vi
	NameEn       string     `json:"nameEn" db:"name_en"` // DB column: name_en
	Slug         string     `json:"slug" db:"slug"`
	Description  *string    `json:"description,omitempty" db:"description"`
	Icon         *string    `json:"icon,omitempty" db:"icon"`
	ParentID     *string    `json:"parentId,omitempty" db:"parent_id"`
	Level        int        `json:"level" db:"level"`
	DisplayOrder int        `json:"displayOrder" db:"display_order"`
	IsActive     bool       `json:"isActive" db:"is_active"`
	Children     []Category `json:"children,omitempty" db:"-"`
	CreatedAt    time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time  `json:"updatedAt" db:"updated_at"`
}

// ── Search ───────────────────────────────────────────────────────────────────

type SearchQuery struct {
	Keyword    string   `json:"keyword" form:"keyword"`
	CategoryID *int     `json:"categoryId,omitempty" form:"categoryId"`
	MinPrice   *float64 `json:"minPrice,omitempty" form:"minPrice"`
	MaxPrice   *float64 `json:"maxPrice,omitempty" form:"maxPrice"`
	Brand      *string  `json:"brand,omitempty" form:"brand"`
	SortBy     string   `json:"sortBy,omitempty" form:"sortBy"`
	Page       int      `json:"page,omitempty" form:"page"`
	Limit      int      `json:"limit,omitempty" form:"limit"`
}

type SearchResponse struct {
	Results     []SearchResult `json:"results"`
	Total       int            `json:"total"`
	Page        int            `json:"page"`
	Limit       int            `json:"limit"`
	TotalPages  int            `json:"totalPages"`
	ResponseMs  int64          `json:"responseMs"`
}

type SearchResult struct {
	Product      Product  `json:"product"`
	LowestPrice  float64  `json:"lowestPrice"`
	SourceCount  int      `json:"sourceCount"`
	Relevance    float64  `json:"relevance"`
}

type SearchSuggestion struct {
	Keyword string `json:"keyword"`
	Count   int    `json:"count"`
}

type PopularKeyword struct {
	Keyword string `json:"keyword"`
	Count   int    `json:"count"`
}

// ── User & Auth ───────────────────────────────────────────────────────────────

type User struct {
	ID           string    `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
	IsActive     bool      `json:"isActive" db:"is_active"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type TokenClaims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}

// ── Affiliate ─────────────────────────────────────────────────────────────────

type AffiliateConfig struct {
	ID             string    `json:"id" db:"id"`
	Platform       string    `json:"platform" db:"platform"`
	RefCode        *string   `json:"refCode,omitempty" db:"ref_code"`
	IsActive       bool      `json:"isActive" db:"is_active"`
	CommissionRate float64   `json:"commissionRate" db:"commission_rate"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" db:"updated_at"`
}

// ── Advertisement ─────────────────────────────────────────────────────────────

type AdZone struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	SlotKey     string    `json:"slotKey" db:"slot_key"`
	Description *string   `json:"description,omitempty" db:"description"`
	IsActive    bool      `json:"isActive" db:"is_active"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}

type Advertisement struct {
	ID          string    `json:"id" db:"id"`
	ZoneID      string    `json:"zoneId" db:"zone_id"`
	Title       string    `json:"title" db:"title"`
	ImageURL    *string   `json:"imageUrl,omitempty" db:"image_url"`
	TargetURL   string    `json:"targetUrl" db:"target_url"`
	IsActive    bool      `json:"isActive" db:"is_active"`
	Priority    int       `json:"priority" db:"priority"`
	StartDate   *time.Time `json:"startDate,omitempty" db:"start_date"`
	EndDate     *time.Time `json:"endDate,omitempty" db:"end_date"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}

// ── Voucher ───────────────────────────────────────────────────────────────────

type Voucher struct {
	ID           string     `json:"id" db:"id"`
	Code         string     `json:"code" db:"code"`
	Platform     string     `json:"platform" db:"platform"`
	Description  *string    `json:"description,omitempty" db:"description"`
	DiscountType string     `json:"discountType" db:"discount_type"`
	DiscountValue float64   `json:"discountValue" db:"discount_value"`
	MinOrderValue *float64  `json:"minOrderValue,omitempty" db:"min_order_value"`
	ExpiresAt     *time.Time `json:"expiresAt,omitempty" db:"expires_at"`
	IsActive      bool      `json:"isActive" db:"is_active"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

// ── Gadget ────────────────────────────────────────────────────────────────────

type Gadget struct {
	ID            string         `json:"id" db:"id"`
	Name          string         `json:"name" db:"name"`
	Slug          string         `json:"slug" db:"slug"`
	Brand         string         `json:"brand" db:"brand"`
	Category      string         `json:"category" db:"category"`
	Specifications map[string]any `json:"specifications,omitempty" db:"specifications"`
	Images        []string       `json:"images,omitempty" db:"images"`
	Description   *string        `json:"description,omitempty" db:"description"`
	IsActive      bool           `json:"isActive" db:"is_active"`
	CreatedAt     time.Time      `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time      `json:"updatedAt" db:"updated_at"`
}

// ── Content / Article ─────────────────────────────────────────────────────────

type Article struct {
	ID          string    `json:"id" db:"id"`
	Title       string    `json:"title" db:"title"`
	Slug        string    `json:"slug" db:"slug"`
	Content     string    `json:"content" db:"content"`
	Excerpt     *string   `json:"excerpt,omitempty" db:"excerpt"`
	CoverImage  *string   `json:"coverImage,omitempty" db:"cover_image"`
	AuthorID    *string   `json:"authorId,omitempty" db:"author_id"`
	IsPublished bool      `json:"isPublished" db:"is_published"`
	PublishedAt *time.Time `json:"publishedAt,omitempty" db:"published_at"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}

// ── Common ────────────────────────────────────────────────────────────────────

type PaginationMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

type APIResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
	Error   *APIError `json:"error,omitempty"`
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NormalizedProduct is used internally by data collection / platform API
type NormalizedProduct struct {
	ExternalID   string         `json:"externalId"`
	Name         string         `json:"name"`
	Brand        *string        `json:"brand,omitempty"`
	Price        float64        `json:"price"`
	Currency     string         `json:"currency"`
	IsAvailable  bool           `json:"isAvailable"`
	Images       []string       `json:"images"`
	SourceURL    string         `json:"sourceUrl"`
	AffiliateURL *string        `json:"affiliateUrl,omitempty"`
	Source       string         `json:"source"`
	Description  *string        `json:"description,omitempty"`
	Model        *string        `json:"model,omitempty"`
	Specifications map[string]any `json:"specifications,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}
