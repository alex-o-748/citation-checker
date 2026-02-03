const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';

export interface WikipediaArticle {
  title: string;
  wikitext: string;
}

export async function fetchWikipediaWikitext(articleUrl: string): Promise<WikipediaArticle> {
  console.log('[Wikipedia] Fetching article from URL:', articleUrl);

  // Extract article title from URL
  const match = articleUrl.match(/\/wiki\/([^?#]+)/);
  if (!match) {
    throw new Error('Invalid Wikipedia URL');
  }

  const title = decodeURIComponent(match[1]);

  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    format: 'json',
    formatversion: '2',
  });

  const response = await fetch(`${WIKIPEDIA_API_URL}?${params}`, {
    headers: {
      'User-Agent': 'WikiCiteVerify/1.0 (https://github.com/wikiciteverify; Citation verification educational tool)',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Wikipedia denied access. The article may be protected or rate limits may apply.');
    } else if (response.status === 404) {
      throw new Error('Wikipedia API endpoint not found.');
    } else if (response.status >= 500) {
      throw new Error('Wikipedia API is temporarily unavailable. Please try again later.');
    }
    throw new Error(`Failed to fetch Wikipedia article: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const pages = data.query?.pages;

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
}
