import axios from 'axios';

const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';

export interface WikipediaArticle {
  title: string;
  wikitext: string;
}

export async function fetchWikipediaWikitext(articleUrl: string): Promise<WikipediaArticle> {
  // Extract article title from URL
  // Example: https://en.wikipedia.org/wiki/Great_Wall_of_China -> Great_Wall_of_China
  const match = articleUrl.match(/\/wiki\/([^?#]+)/);
  if (!match) {
    throw new Error('Invalid Wikipedia URL');
  }

  // Keep the title as-is from the URL (preserving underscores and URL encoding)
  const title = decodeURIComponent(match[1]);

  try {
    // Fetch the wikitext using Wikipedia API
    const response = await axios.get(WIKIPEDIA_API_URL, {
      params: {
        action: 'query',
        titles: title,
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        format: 'json',
      },
    });

    const pages = response.data.query.pages;
    const pageId = Object.keys(pages)[0];

    if (pageId === '-1') {
      throw new Error('Article not found');
    }

    const page = pages[pageId];
    const wikitext = page.revisions[0].slots.main['*'];

    return {
      title: page.title,
      wikitext,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch Wikipedia article: ${error.message}`);
    }
    throw error;
  }
}
