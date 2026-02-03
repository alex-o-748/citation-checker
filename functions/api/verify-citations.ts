import { fetchWikipediaWikitext } from '../lib/wikipedia';
import { extractCitationInstances } from '../lib/wikitext-parser';
import { fetchSourceFromCitation } from '../lib/source-fetcher';
import { verifyClaim, type AIProvider } from '../lib/ai-providers';
import { saveVerificationCheck } from '../lib/storage';
import { jsonResponse, errorResponse, handleCors } from '../lib/response';

interface Env {
  DATABASE_URL: string;
  PUBLICAI_API_KEY: string;
  OLLAMA_API_KEY?: string;
}

interface VerifyRequest {
  wikipediaUrl: string;
  refTagName: string;
  sourceText?: string;
  apiKey?: string;
  provider?: AIProvider;
  fullContent?: string;
}

interface CitationResult {
  id: number;
  wikipediaClaim: string;
  sourceExcerpt: string;
  confidence: number;
  supportStatus: 'supported' | 'partially_supported' | 'not_supported';
  reasoning?: string;
}

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return handleCors();
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as VerifyRequest;

    // Validate request
    if (!body.wikipediaUrl || !body.refTagName) {
      return errorResponse('Invalid request data: wikipediaUrl and refTagName are required', 400);
    }

    const {
      wikipediaUrl,
      refTagName,
      sourceText: providedSourceText,
      apiKey,
      provider = 'publicai',
      fullContent,
    } = body;

    // Step 1: Fetch Wikipedia article wikitext
    let article;
    try {
      article = await fetchWikipediaWikitext(wikipediaUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch Wikipedia article';
      return errorResponse(message, 400);
    }

    // Step 2: Get the full reference tag from the wikitext to extract URL
    let refTagContent = fullContent || refTagName;

    if (!fullContent && !refTagName.startsWith('{{sfn') && !refTagName.startsWith('__unnamed_')) {
      const refPattern = new RegExp(
        `<ref\\s+name\\s*=\\s*["']?${refTagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*>(.*?)<\\/ref>`,
        'i'
      );
      const match = article.wikitext.match(refPattern);
      if (match) {
        refTagContent = match[0];
      }
    }

    // Step 3: Determine source text (use provided or auto-fetch)
    let sourceText = providedSourceText;
    let sourceUrl: string | undefined;
    let sourceFetchedAutomatically = false;

    if (!sourceText) {
      console.log('[API] No source text provided, attempting to auto-fetch...');
      try {
        const fetchedSource = await fetchSourceFromCitation(refTagContent);

        if (fetchedSource) {
          sourceText = fetchedSource.text;
          sourceUrl = fetchedSource.url;
          sourceFetchedAutomatically = true;
          console.log('[API] Successfully auto-fetched source from:', sourceUrl);
        } else {
          return errorResponse('No URL found in citation and no source text provided. Please provide the source text manually.', 400);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch source';
        return errorResponse(`Could not auto-fetch source: ${message}. Please provide the source text manually.`, 400);
      }
    }

    // Step 4: Extract citation instances
    const citationInstances = extractCitationInstances(article.wikitext, refTagName, fullContent);

    if (citationInstances.length === 0) {
      return jsonResponse({
        results: [],
        sourceIdentifier: refTagName,
      });
    }

    // Step 5: Verify each claim with the selected AI provider
    const verificationPromises = citationInstances.map(async (instance, index) => {
      try {
        const verification = await verifyClaim(instance.claim, sourceText!, apiKey, provider, {
          PUBLICAI_API_KEY: env.PUBLICAI_API_KEY,
          OLLAMA_API_KEY: env.OLLAMA_API_KEY,
        });

        const result: CitationResult = {
          id: index + 1,
          wikipediaClaim: instance.claim,
          sourceExcerpt: verification.relevantExcerpt,
          confidence: verification.confidence,
          supportStatus: verification.supportStatus,
          reasoning: verification.reasoning,
        };

        return result;
      } catch (error) {
        console.error(`Failed to verify claim ${index + 1}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
          id: index + 1,
          wikipediaClaim: instance.claim,
          sourceExcerpt: `Verification failed: ${errorMessage}`,
          confidence: 0,
          supportStatus: 'not_supported' as const,
          reasoning: `Error during verification: ${errorMessage}`,
        };
      }
    });

    const results = await Promise.all(verificationPromises);

    // Save verification results to database (if DATABASE_URL is configured)
    if (env.DATABASE_URL) {
      try {
        await saveVerificationCheck(
          env.DATABASE_URL,
          wikipediaUrl,
          refTagName,
          sourceText!,
          sourceUrl,
          provider,
          results.map((r) => ({
            wikipediaClaim: r.wikipediaClaim,
            sourceExcerpt: r.sourceExcerpt,
            confidence: r.confidence,
            supportStatus: r.supportStatus,
            reasoning: r.reasoning,
          }))
        );
        console.log('[Storage] Verification results saved to database');
      } catch (error) {
        console.error('[Storage] Failed to save verification results:', error);
      }
    }

    return jsonResponse({
      results,
      sourceIdentifier: refTagName,
      sourceUrl,
      sourceFetchedAutomatically,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to verify citations',
      500
    );
  }
};
