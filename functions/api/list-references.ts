import { fetchWikipediaWikitext } from '../lib/wikipedia';
import { listAllReferences } from '../lib/wikitext-parser';
import { jsonResponse, errorResponse, handleCors } from '../lib/response';

interface Env {
  DATABASE_URL: string;
  PUBLICAI_API_KEY: string;
  OLLAMA_API_KEY?: string;
}

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return handleCors();
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request } = context;

  try {
    const url = new URL(request.url);
    const wikipediaUrl = url.searchParams.get('url');

    if (!wikipediaUrl) {
      return errorResponse('Missing required parameter: url', 400);
    }

    // Fetch Wikipedia article wikitext
    let article;
    try {
      article = await fetchWikipediaWikitext(wikipediaUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch Wikipedia article';
      return errorResponse(message, 400);
    }

    // Extract all references
    const references = listAllReferences(article.wikitext);

    return jsonResponse({
      articleTitle: article.title,
      references,
      total: references.length,
    });
  } catch (error) {
    console.error('List references error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list references',
      500
    );
  }
};
