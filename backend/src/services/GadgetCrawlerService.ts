/**
 * GadgetCrawlerService
 * Crawls GSMArena device pages and extracts specs into our GadgetSpecs format.
 *
 * Usage (admin seed):
 *   const result = await gadgetCrawlerService.crawlGSMArena(url);
 *   // Admin reviews result.specs, then saves via GadgetService.upsertDevice()
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { GadgetSpecs } from './GadgetService';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Map GSMArena section headings → our spec keys
// Sections mapped to '__skip__' are intentionally ignored (not stored)
const SECTION_MAP: Record<string, string> = {
  'Network':        'network',
  'Launch':         'launch',
  'Body':           'body',
  'Display':        'display',
  'Platform':       'platform',
  'Memory':         'memory',
  'Main Camera':    'main_camera',
  'Selfie camera':  'selfie_camera',
  'Sound':          'sound',
  'Comms':          'comms',
  'Features':       'features',
  'Battery':        'battery',
  'Misc':           'misc',
  // Intentionally skipped sections:
  'Tests':          '__skip__',   // Our Tests — benchmark scores not stored
  'EU LABEL':       '__skip__',   // EU energy/repairability labels not stored
};

export interface CrawlResult {
  name: string;
  imageUrl?: string;
  gsmarenaUrl: string;
  announced?: string;
  released?: string;
  status?: string;
  specs: GadgetSpecs;
  /** Detected category based on page content */
  category: 'mobile' | 'tablet' | 'smartwatch';
}

export class GadgetCrawlerService {

  async crawlGSMArena(url: string): Promise<CrawlResult> {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.gsmarena.com/',
      },
      timeout: 15_000,
    });

    const $ = cheerio.load(html);

    // ── Device name ────────────────────────────────────────────────────────────
    const name = $('h1.specs-phone-name-title').text().trim()
      || $('h1').first().text().trim();

    // ── Main image ─────────────────────────────────────────────────────────────
    const imageUrl =
      $('#specs-list table').first().find('img').attr('src') ||
      $('.specs-photo-main a img').attr('src') ||
      $('img.specs-photo-main').attr('src') ||
      undefined;

    // ── Category detection ─────────────────────────────────────────────────────
    const nameLower = name.toLowerCase();
    let category: CrawlResult['category'] = 'mobile';
    if (nameLower.includes('watch') || nameLower.includes('band')) {
      category = 'smartwatch';
    } else if (nameLower.includes('tab') || nameLower.includes('pad') || nameLower.includes('fold')) {
      category = 'tablet';
    }

    // ── Specs table ────────────────────────────────────────────────────────────
    const specs: GadgetSpecs = {};
    let currentSection = 'misc';

    // Track last labeled key so unlabeled continuation rows are stored as
    // key_r1, key_r2, … instead of being lost.
    let lastLabeledKey: string | null = null;
    let orphanCount = 0;

    // Strip HTML tags and decode basic entities → plain text
    const stripHtml = (html: string): string =>
      html
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, '')
        .replace(/&[a-z]+;/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    $('#specs-list table').each((_i, table) => {
      $(table).find('tr').each((_j, row) => {
        const $row = $(row);

        // Section heading row (contains <th>).
        // IMPORTANT: do NOT return early — GSMArena puts the first data row
        // (.ttl + .nfo) in the SAME <tr> as the section <th>.  Returning here
        // would silently drop Dimensions, Technology, OS, Announced, Type,
        // Loudspeaker, WLAN, Sensors, Battery Type, camera modules, etc.
        const th = $row.find('th');
        if (th.length) {
          const heading = th.text().trim();
          const mapped = SECTION_MAP[heading];
          if (mapped) {
            currentSection = mapped; // may be '__skip__'
            lastLabeledKey = null;   // reset per section
            orphanCount = 0;
            if (currentSection !== '__skip__' && !specs[currentSection]) {
              specs[currentSection] = {};
            }
          }
          // Fall through — process .ttl/.nfo in this same row below
        }

        // Skip rows belonging to a skipped section
        if (currentSection === '__skip__') return;

        // Data row: .ttl (label) + .nfo (value)
        // .nfo may contain <br>-separated lines (SIM variants, camera modules,
        // battery capacities, charging types, etc.) — split and store as _rN.
        const label = $row.find('.ttl').text().replace(/\s+/g, ' ').trim();
        const $nfo  = $row.find('.nfo');
        if (!$nfo.length) return;

        const nfoHtml = $nfo.html() ?? '';
        const parts   = nfoHtml
          .split(/<br\s*\/?>/i)
          .map(stripHtml)
          .filter(p => p && p !== '-');

        if (!parts.length) return;
        if (!specs[currentSection]) specs[currentSection] = {};

        if (label) {
          // Labeled row — normalize label to snake_case key
          const key = label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');

          specs[currentSection]![key] = parts[0];
          lastLabeledKey = key;
          // <br>-separated continuation parts → r1, r2, … (skip "No")
          orphanCount = 0;
          for (let i = 1; i < parts.length; i++) {
            if (/^no$/i.test(parts[i])) continue;
            orphanCount++;
            specs[currentSection]![`${key}_r${orphanCount}`] = parts[i];
          }
        } else {
          // Unlabeled continuation/orphan row
          for (const part of parts) {
            if (/^no$/i.test(part)) continue; // e.g. Watch Camera section = "No"
            if (lastLabeledKey !== null) {
              orphanCount++;
              specs[currentSection]![`${lastLabeledKey}_r${orphanCount}`] = part;
            }
          }
        }
      });
    });

    // ── Extract announced/released/status from launch section ──────────────────
    const launch = specs['launch'] ?? {};
    const announced = launch['announced'];
    const statusRaw = launch['status'] ?? '';
    const released = statusRaw.match(/Released\s+([\d,\s\w]+)/i)?.[1]?.trim();

    return {
      name,
      imageUrl,
      gsmarenaUrl: url,
      announced,
      released,
      status: statusRaw || undefined,
      category,
      specs,
    };
  }

  // ── Keyword search on GSMArena ────────────────────────────────────────────

  /**
   * Search GSMArena by keyword, return list of matching devices with their URLs.
   * User picks one → pass URL to crawlGSMArena().
   */
  async searchGSMArena(keyword: string): Promise<SearchResult[]> {
    const searchUrl = `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(keyword)}`;
    console.log(`[GadgetCrawler] Searching: ${searchUrl}`);

    let html: string;
    try {
      const resp = await axios.get(searchUrl, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.gsmarena.com/search.php3',
        },
        timeout: 15_000,
      });
      html = resp.data;
      console.log(`[GadgetCrawler] Got HTML: ${html.length} chars, status: ${resp.status}`);
    } catch (err: any) {
      console.error(`[GadgetCrawler] Fetch failed:`, err.message);
      return [];
    }

    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Debug: log what selectors find
    const makersCount = $('.makers').length;
    const liCount = $('.makers ul li').length;
    console.log(`[GadgetCrawler] .makers: ${makersCount}, li: ${liCount}`);

    // If .makers not found, try alternative selectors
    const selectors = ['.makers ul li', '#review-body ul li', '.general-menu ul li a'];
    let matched = false;

    for (const sel of selectors) {
      if (matched) break;
      $(sel).each((_i, el) => {
        matched = true;
        const $a = sel.endsWith(' a') ? $(el) : $(el).find('a');
        const href = $a.attr('href') ?? '';
        if (!href || href === '#') return;

        const url = href.startsWith('http')
          ? href
          : `https://www.gsmarena.com/${href}`;

        const name = $a.find('strong').text().replace(/\s+/g, ' ').trim()
          || $a.text().replace(/\s+/g, ' ').trim();

        const imageUrl = $a.find('img').attr('src') ?? undefined;

        if (name && url.includes('gsmarena.com') && url.includes('.php')) {
          results.push({ name, url, imageUrl });
        }
      });
    }

    console.log(`[GadgetCrawler] Found ${results.length} results`);
    if (results.length === 0 && html.length > 0) {
      // Log a snippet for debugging
      const snippet = html.substring(0, 500).replace(/\s+/g, ' ');
      console.log(`[GadgetCrawler] HTML snippet: ${snippet}`);
    }

    return results;
  }
}

export interface SearchResult {
  name: string;
  url: string;
  imageUrl?: string;
}

export const gadgetCrawlerService = new GadgetCrawlerService();
