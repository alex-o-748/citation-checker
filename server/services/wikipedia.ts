import axios from 'axios';

export interface WikipediaArticle {
  title: string;
  wikitext: string;
}

function getWikipediaApiUrl(articleUrl: string): string {
  // Extract the language subdomain from the Wikipedia URL
  // Example: https://ru.wikipedia.org/wiki/Article -> ru
  // Example: https://en.wikipedia.org/wiki/Article -> en
  const langMatch = articleUrl.match(/https?:\/\/([a-z-]+)\.wikipedia\.org/i);
  const lang = langMatch ? langMatch[1].toLowerCase() : 'en';
  return `https://${lang}.wikipedia.org/w/api.php`;
}

export async function fetchWikipediaWikitext(articleUrl: string): Promise<WikipediaArticle> {
  console.log('[Wikipedia] Fetching article from URL:', articleUrl);

  // Extract article title from URL
  // Example: https://en.wikipedia.org/wiki/Great_Wall_of_China -> Great_Wall_of_China
  const match = articleUrl.match(/\/wiki\/([^?#]+)/);
  if (!match) {
    throw new Error('Invalid Wikipedia URL');
  }

  // Keep the title as-is from the URL (preserving underscores and URL encoding)
  const title = decodeURIComponent(match[1]);

  // Get the appropriate Wikipedia API URL based on the language subdomain
  const apiUrl = getWikipediaApiUrl(articleUrl);

  console.log('[Wikipedia] Using API URL:', apiUrl);

  try {
    // Fetch the wikitext using Wikipedia API
    // Wikipedia requires a descriptive User-Agent with contact info per their API guidelines
    const response = await axios.get(apiUrl, {
      params: {
        action: 'query',
        titles: title,
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        format: 'json',
        formatversion: '2',
      },
      headers: {
        'User-Agent': 'WikiCiteVerify/1.0 (https://github.com/wikiciteverify; Citation verification educational tool)',
      },
    });

    const pages = response.data.query.pages;
    
    if (!pages || pages.length === 0) {
      throw new Error('Article not found');
    }

    const page = pages[0];
    
    if (page.missing) {
      throw new Error('Article not found');
    }

    if (!page.revisions || page.revisions.length === 0) {
      throw new Error('No content available for this article');
    }

    const wikitext = page.revisions[0].slots.main.content;

    return {
      title: page.title,
      wikitext,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 403) {
        throw new Error('Wikipedia denied access. The article may be protected or rate limits may apply.');
      } else if (status === 404) {
        throw new Error('Wikipedia API endpoint not found.');
      } else if (status && status >= 500) {
        throw new Error('Wikipedia API is temporarily unavailable. Please try again later.');
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('Request to Wikipedia timed out. Please try again.');
      }
      throw new Error(`Failed to fetch Wikipedia article: ${error.message}`);
    }
    throw error;
  }
}
