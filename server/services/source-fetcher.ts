import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SourceContent {
  text: string;
  title?: string;
  url: string;
}

/**
 * Extract URL from a Wikipedia citation reference tag
 * Handles both <ref> tags and {{sfn}} citations
 */
export function extractUrlFromCitation(refTag: string): string | null {
  console.log('[SourceFetcher] Extracting URL from citation:', refTag.substring(0, 100) + '...');

  // First, try archive-url (preferred as original URLs often go dead)
  const archiveUrlMatch = refTag.match(/archive-url\s*=\s*([^|}\s]+)/i);
  if (archiveUrlMatch) {
    const url = archiveUrlMatch[1].trim();
    console.log('[SourceFetcher] Found archive URL:', url);
    return url;
  }

  // Fall back to regular url= parameter
  const urlMatch = refTag.match(/(?:^|[|{}\s])url\s*=\s*([^|}\s]+)/i);
  if (urlMatch) {
    const url = urlMatch[1].trim();
    console.log('[SourceFetcher] Found URL:', url);
    return url;
  }

  // Look for bare URLs (http:// or https://)
  const bareUrlMatch = refTag.match(/https?:\/\/[^\s<>"|{}\\^`\[\]]+/i);
  if (bareUrlMatch) {
    const url = bareUrlMatch[0].trim();
    console.log('[SourceFetcher] Found bare URL:', url);
    return url;
  }

  console.log('[SourceFetcher] No URL found in citation');
  return null;
}

/**
 * Fetch and extract text content from an HTML page
 */
export async function fetchSourceContent(url: string): Promise<SourceContent> {
  console.log('[SourceFetcher] Fetching content from:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'WikiCiteVerify/1.0 (Citation verification educational tool)',
      },
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove script, style, and other non-content elements
    $('script, style, nav, header, footer, aside, iframe, noscript').remove();

    // Try to find the main content area
    // Common selectors for article content
    let mainContent = $('article, main, [role="main"], .article-content, .post-content, .entry-content').first();

    // If no main content found, use body
    if (mainContent.length === 0) {
      mainContent = $('body');
    }

    // Extract text
    let text = mainContent.text();

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim();

    console.log('[SourceFetcher] Successfully extracted content:', {
      url,
      textLength: text.length,
      title: title.substring(0, 50),
    });

    if (text.length < 100) {
      throw new Error('Extracted content is too short (likely failed to parse page properly)');
    }

    return {
      text,
      title,
      url,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 403) {
        throw new Error('Access denied. The source may require authentication or block automated access.');
      } else if (status === 404) {
        throw new Error('Source page not found (404).');
      } else if (status && status >= 500) {
        throw new Error('Source website is temporarily unavailable. Please try again later.');
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('Request to source timed out. Please try again or provide the text manually.');
      }
      throw new Error(`Failed to fetch source: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Extract URL from citation and fetch the source content
 */
export async function fetchSourceFromCitation(refTag: string): Promise<SourceContent | null> {
  const url = extractUrlFromCitation(refTag);

  if (!url) {
    return null;
  }

  try {
    return await fetchSourceContent(url);
  } catch (error) {
    console.error('[SourceFetcher] Failed to fetch source:', error);
    throw error;
  }
}