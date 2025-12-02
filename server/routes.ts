import type { Express } from "express";
import { createServer, type Server } from "http";
import { verifyRequestSchema, type CitationResult, type AIProvider } from "@shared/schema";
import { fetchWikipediaWikitext } from "./services/wikipedia";
import { extractCitationInstances, listAllReferences } from "./services/wikitext-parser";
import { verifyClaim as verifyWithClaude } from "./services/claude";
import { verifyClaim as verifyWithOpenAI } from "./services/openai";
import { verifyClaim as verifyWithGemini } from "./services/gemini";
import { fetchSourceFromCitation } from "./services/source-fetcher";
import { storage } from "./storage";

async function verifyClaim(
  claim: string,
  sourceText: string,
  apiKey: string,
  provider: AIProvider
) {
  const trimmedKey = apiKey.trim();
  
  switch (provider) {
    case 'openai':
      return verifyWithOpenAI(claim, sourceText, trimmedKey);
    case 'gemini':
      return verifyWithGemini(claim, sourceText, trimmedKey);
    case 'claude':
    default:
      return verifyWithClaude(claim, sourceText, trimmedKey);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // List all references in a Wikipedia article
  app.get("/api/list-references", async (req, res) => {
    try {
      const wikipediaUrl = req.query.url as string;

      if (!wikipediaUrl) {
        return res.status(400).json({ 
          error: "Missing required parameter: url" 
        });
      }

      // Fetch Wikipedia article wikitext
      let article;
      try {
        article = await fetchWikipediaWikitext(wikipediaUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch Wikipedia article";
        return res.status(400).json({ error: message });
      }

      // Extract all references
      const references = listAllReferences(article.wikitext);

      res.json({
        articleTitle: article.title,
        references,
        total: references.length,
      });
    } catch (error) {
      console.error("List references error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to list references" 
      });
    }
  });
  
  // Citation verification endpoint
  app.post("/api/verify-citations", async (req, res) => {
    try {
      const validationResult = verifyRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validationResult.error.errors 
        });
      }

      const { wikipediaUrl, refTagName, sourceText: providedSourceText, apiKey, provider, fullContent } = validationResult.data;
      
      // Step 1: Fetch Wikipedia article wikitext
      let article;
      try {
        article = await fetchWikipediaWikitext(wikipediaUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch Wikipedia article";
        return res.status(400).json({ error: message });
      }

      // Step 2: Get the full reference tag from the wikitext to extract URL
      let refTagContent = fullContent || refTagName;
      
      // If no fullContent provided and it's a named ref, find it in wikitext
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
            return res.status(400).json({
              error: "No URL found in citation and no source text provided. Please provide the source text manually.",
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to fetch source";
          return res.status(400).json({
            error: `Could not auto-fetch source: ${message}. Please provide the source text manually.`,
          });
        }
      }

      // Step 4: Extract citation instances
      const citationInstances = extractCitationInstances(
        article.wikitext, 
        refTagName,
        fullContent  // New parameter
      );
      
      if (citationInstances.length === 0) {
        return res.json({
          results: [],
          sourceIdentifier: refTagName,
        });
      }

      // Step 5: Verify each claim with the selected AI provider
      const verificationPromises = citationInstances.map(async (instance, index) => {
        try {
          const verification = await verifyClaim(instance.claim, sourceText, apiKey, provider);
          
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
          
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          // Return a low-confidence result if verification fails
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

      // Save verification results to database
      try {
        await storage.saveVerificationCheck(
          wikipediaUrl,
          refTagName,
          sourceText,
          sourceUrl,
          results.map(r => ({
            wikipediaClaim: r.wikipediaClaim,
            sourceExcerpt: r.sourceExcerpt,
            confidence: r.confidence,
            supportStatus: r.supportStatus,
            reasoning: r.reasoning,
          }))
        );
        console.log('[Storage] Verification results saved to database');
      } catch (error) {
        // Don't fail the request if database save fails
        console.error('[Storage] Failed to save verification results:', error);
      }

      res.json({
        results,
        sourceIdentifier: refTagName,
        sourceUrl,
        sourceFetchedAutomatically,
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to verify citations" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
