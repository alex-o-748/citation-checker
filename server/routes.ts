import type { Express } from "express";
import { createServer, type Server } from "http";
import { verifyRequestSchema, type CitationResult } from "@shared/schema";
import { fetchWikipediaWikitext } from "./services/wikipedia";
import { extractCitationInstances } from "./services/wikitext-parser";
import { verifyClaim } from "./services/claude";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Citation verification endpoint
  app.post("/api/verify-citations", async (req, res) => {
    try {
      // Validate API key is configured
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({
          error: "Citation verification service is not configured. Please add ANTHROPIC_API_KEY to environment variables.",
        });
      }

      const validationResult = verifyRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validationResult.error.errors 
        });
      }

      const { wikipediaUrl, refTagName, sourceText } = validationResult.data;

      // Step 1: Fetch Wikipedia article wikitext
      let article;
      try {
        article = await fetchWikipediaWikitext(wikipediaUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch Wikipedia article";
        return res.status(400).json({ error: message });
      }

      // Step 2: Extract citation instances
      const citationInstances = extractCitationInstances(article.wikitext, refTagName);

      if (citationInstances.length === 0) {
        return res.json({
          results: [],
          sourceIdentifier: refTagName,
        });
      }

      // Step 3: Verify each claim with Claude
      const verificationPromises = citationInstances.map(async (instance, index) => {
        try {
          const verification = await verifyClaim(instance.claim, sourceText);
          
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
