import { fetchWikipediaWikitext } from '../lib/wikipedia';
import { listAllReferences } from '../lib/wikitext-parser';

interface Env {
  DATABASE_URL: string;
  PUBLICAI_API_KEY: string;
  OLLAMA_API_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request } = context;

  try {
    const url = new URL(request.url);
    const wikipediaUrl = url.searchParams.get('url');

    if (!wikipediaUrl) {
      return Response.json(
        { error: 'Missing required parameter: url' },
        { status: 400 }
      );
    }

    // Fetch Wikipedia article wikitext
    let article;
    try {
      article = await fetchWikipediaWikitext(wikipediaUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch Wikipedia article';
      return Response.json({ error: message }, { status: 400 });
    }

    // Extract all references
    const references = listAllReferences(article.wikitext);

    return Response.json({
      articleTitle: article.title,
      references,
      total: references.length,
    });
  } catch (error) {
    console.error('List references error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to list references' },
      { status: 500 }
    );
  }
};
