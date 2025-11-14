import { z } from "zod";

// Citation verification request
export const verifyRequestSchema = z.object({
  wikipediaUrl: z.string().url(),
  refTagName: z.string().min(1),
  sourceText: z.string().min(1),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;

// Citation result
export const citationResultSchema = z.object({
  id: z.number(),
  wikipediaClaim: z.string(),
  sourceExcerpt: z.string(),
  confidence: z.number(),
  supportStatus: z.enum(['supported', 'partially_supported', 'not_supported']),
  reasoning: z.string().optional(),
});

export type CitationResult = z.infer<typeof citationResultSchema>;

// Verification response
export const verifyResponseSchema = z.object({
  results: z.array(citationResultSchema),
  sourceIdentifier: z.string(),
});

export type VerifyResponse = z.infer<typeof verifyResponseSchema>;
