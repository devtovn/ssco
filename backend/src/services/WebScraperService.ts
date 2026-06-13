/**
 * Web Scraper Service
 * Puppeteer-based scraping with proxy rotation, CAPTCHA detection, and retries
 */

import { NormalizedProduct } from './APIIntegratorService';

export interface ScrapeResult {
  success: boolean;
  data?: NormalizedProduct;
  error?: string;
  captchaDetected?: boolean;
  source: string;
  url: string;
  timestamp: Date;
}

export interface ScrapeBatchResult {
  success: boolean;
  results: ScrapeResult[];
  successCount: number;
  failedCount: number;
  captchaCount: number;
  timestamp: Date;
}

export interface ScraperConfig {
  enabled: boolean;
  headless: boolean;
  timeoutMs: number;
  maxRetries: number;
  proxies: string[];
}

const CAPTCHA_INDICATORS = [
  'captcha',
  'recaptcha',
  'hcaptcha',
  'cf-turnstile',
  'robot',
  'xác minh bạn không phải robot',
];

const DEFAULT_SELECTORS = {
  name: ['h1', '[data-testid="product-name"]', '.product-name', '.pdp-mod-product-badge-title'],
  price: [
    '[data-testid="product-price"]',
    '.product-price__current-price',
    '.pdp-product-price',
    '[class*="price"]',
  ],
  image: ['img.product-image', '.product-image img', '[data-testid="product-image"] img', 'img'],
  brand: ['[data-testid="brand"]', '.brand', '.pdp-mod-product-badge-brand'],
};

type PuppeteerBrowser = {
  newPage: () => Promise<PuppeteerPage>;
  close: () => Promise<void>;
};

type PuppeteerPage = {
  goto: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
  content: () => Promise<string>;
  title: () => Promise<string>;
  evaluate: <T>(
    fn: string | ((...args: unknown[]) => T),
    ...args: unknown[]
  ) => Promise<T>;
  setUserAgent: (ua: string) => Promise<void>;
  setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<void>;
  close: () => Promise<void>;
};

export class WebScraperService {
  private config: ScraperConfig;
  private proxyIndex = 0;

  constructor(config?: Partial<ScraperConfig>) {
    const proxyList = (process.env.PROXY_SERVICE_URL || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    this.config = {
      enabled: process.env.SCRAPING_ENABLED !== 'false',
      headless: process.env.SCRAPER_HEADLESS !== 'false',
      timeoutMs: parseInt(process.env.SCRAPER_TIMEOUT_MS || '30000', 10),
      maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES || '3', 10),
      proxies: proxyList,
      ...config,
    };
  }

  /**
   * Scrape multiple product URLs
   */
  async scrapeUrls(urls: string[]): Promise<ScrapeBatchResult> {
    const results: ScrapeResult[] = [];

    for (const url of urls) {
      const result = await this.scrapeUrl(url);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const captchaCount = results.filter((r) => r.captchaDetected).length;

    return {
      success: successCount > 0,
      results,
      successCount,
      failedCount: results.length - successCount,
      captchaCount,
      timestamp: new Date(),
    };
  }

  /**
   * Scrape a single product URL with retries and proxy rotation
   */
  async scrapeUrl(url: string, attempt = 0): Promise<ScrapeResult> {
    const source = this.detectSource(url);
    const timestamp = new Date();

    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Web scraping is disabled (SCRAPING_ENABLED=false)',
        source,
        url,
        timestamp,
      };
    }

    if (attempt >= this.config.maxRetries) {
      return {
        success: false,
        error: `Max retries (${this.config.maxRetries}) exceeded`,
        source,
        url,
        timestamp,
      };
    }

    let browser: PuppeteerBrowser | null = null;

    try {
      const puppeteer = await this.loadPuppeteer();
      const launchOptions: Record<string, unknown> = {
        headless: this.config.headless ? 'new' : false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      };

      const proxy = this.getNextProxy();
      if (proxy) {
        launchOptions.args = [
          ...(launchOptions.args as string[]),
          `--proxy-server=${proxy}`,
        ];
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      });

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeoutMs,
      });

      const html = await page.content();
      const pageTitle = await page.title();

      if (this.detectCaptcha(html, pageTitle)) {
        await page.close();
        if (attempt + 1 >= this.config.maxRetries) {
          return {
            success: false,
            error: 'CAPTCHA detected',
            captchaDetected: true,
            source,
            url,
            timestamp,
          };
        }
        return this.scrapeUrl(url, attempt + 1);
      }

      const extracted = await this.extractProductFromPage(page);

      await page.close();

      if (!extracted.name || extracted.price <= 0) {
        return this.scrapeUrl(url, attempt + 1);
      }

      const product: NormalizedProduct = {
        externalId: this.extractExternalId(url),
        name: extracted.name,
        brand: extracted.brand || undefined,
        price: extracted.price,
        currency: 'VND',
        isAvailable: true,
        images: extracted.image ? [extracted.image] : [],
        sourceUrl: url,
        source,
        metadata: { scrapedAt: timestamp.toISOString(), proxy },
      };

      return { success: true, data: product, source, url, timestamp };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[WebScraper] Failed to scrape ${url} (attempt ${attempt + 1}):`, message);

      if (attempt + 1 < this.config.maxRetries) {
        await this.delay(1000 * (attempt + 1));
        return this.scrapeUrl(url, attempt + 1);
      }

      return { success: false, error: message, source, url, timestamp };
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
    }
  }

  /**
   * Validate and normalize scraped product data
   */
  validateProduct(data: NormalizedProduct): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Product name is required (min 2 characters)');
    }

    if (!data.price || data.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (!data.sourceUrl || !this.isValidUrl(data.sourceUrl)) {
      errors.push('Valid source URL is required');
    }

    if (!data.source) {
      errors.push('Source platform is required');
    }

    return { valid: errors.length === 0, errors };
  }

  detectCaptcha(html: string, title: string): boolean {
    const haystack = `${html} ${title}`.toLowerCase();
    return CAPTCHA_INDICATORS.some((indicator) => haystack.includes(indicator));
  }

  detectSource(url: string): string {
    if (url.includes('tiki.vn')) return 'tiki';
    if (url.includes('lazada.vn')) return 'lazada';
    if (url.includes('shopee.vn')) return 'shopee';
    if (url.includes('tiktok.com')) return 'tiktok_shop';
    if (url.includes('sendo.vn')) return 'sendo';
    return 'unknown';
  }

  buildSearchUrl(platform: string, keyword: string): string | null {
    const encoded = encodeURIComponent(keyword);
    switch (platform) {
      case 'tiki':
        return `https://tiki.vn/search?q=${encoded}`;
      case 'lazada':
        return `https://www.lazada.vn/catalog/?q=${encoded}`;
      case 'shopee':
        return `https://shopee.vn/search?keyword=${encoded}`;
      default:
        return null;
    }
  }

  private async extractProductFromPage(page: PuppeteerPage): Promise<{
    name: string;
    price: number;
    image: string;
    brand: string;
  }> {
    const selectorsJson = JSON.stringify(DEFAULT_SELECTORS);

    return page.evaluate(`
      (() => {
        const selectors = ${selectorsJson};
        const pickText = (sels) => {
          for (const sel of sels) {
            const el = document.querySelector(sel);
            if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
          }
          return '';
        };
        const pickPrice = (sels) => {
          const text = pickText(sels);
          const match = text.replace(/[^\\d]/g, '');
          return match ? parseInt(match, 10) : 0;
        };
        const pickImage = (sels) => {
          for (const sel of sels) {
            const el = document.querySelector(sel);
            if (!el) continue;
            const src = el.src || el.getAttribute('data-src');
            if (src) return src;
          }
          return '';
        };
        return {
          name: pickText(selectors.name),
          price: pickPrice(selectors.price),
          image: pickImage(selectors.image),
          brand: pickText(selectors.brand),
        };
      })()
    `) as Promise<{ name: string; price: number; image: string; brand: string }>;
  }

  private extractExternalId(url: string): string {
    const segments = url.split('/').filter(Boolean);
    return segments[segments.length - 1] || url;
  }

  private getNextProxy(): string | undefined {
    if (this.config.proxies.length === 0) return undefined;
    const proxy = this.config.proxies[this.proxyIndex % this.config.proxies.length];
    this.proxyIndex++;
    return proxy;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private async loadPuppeteer(): Promise<{
    launch: (options?: Record<string, unknown>) => Promise<PuppeteerBrowser>;
  }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('puppeteer');
    } catch {
      throw new Error(
        'Puppeteer is not installed. Run: npm install puppeteer --workspace=kombe-backend'
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const webScraperService = new WebScraperService();
