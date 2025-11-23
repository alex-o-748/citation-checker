import { z } from "zod";
import { pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Citation verification request
export const verifyRequestSchema = z.object({
  wikipediaUrl: z.string().url(),
  refTagName: z.string().min(1),
  sourceText: z.string().optional(),
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
  sourceUrl: z.string().optional(),
  sourceFetchedAutomatically: z.boolean().optional(),
});

export type VerifyResponse = z.infer<typeof verifyResponseSchema>;

// Database tables
export const verificationChecks = pgTable("verification_checks", {
  id: serial("id").primaryKey(),
  wikipediaUrl: text("wikipedia_url").notNull(),
  refTagName: text("ref_tag_name").notNull(),
  sourceText: text("source_text").notNull(),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const citationResults = pgTable("citation_results", {
  id: serial("id").primaryKey(),
  checkId: integer("check_id").notNull().references(() => verificationChecks.id),
  wikipediaClaim: text("wikipedia_claim").notNull(),
  sourceExcerpt: text("source_excerpt").notNull(),
  confidence: integer("confidence").notNull(),
  supportStatus: varchar("support_status", { length: 50 }).notNull(),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertVerificationCheckSchema = createInsertSchema(verificationChecks).omit({
  id: true,
  createdAt: true,
});

export const insertCitationResultSchema = createInsertSchema(citationResults).omit({
  id: true,
  createdAt: true,
});

// Types
export type VerificationCheck = typeof verificationChecks.$inferSelect;
export type InsertVerificationCheck = z.infer<typeof insertVerificationCheckSchema>;
export type CitationResultDb = typeof citationResults.$inferSelect;
export type InsertCitationResult = z.infer<typeof insertCitationResultSchema>;
