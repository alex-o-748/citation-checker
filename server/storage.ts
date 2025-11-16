import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { 
  verificationChecks, 
  citationResults,
  type InsertVerificationCheck,
  type InsertCitationResult,
  type VerificationCheck,
  type CitationResultDb
} from '@shared/schema';
import { initDatabase } from './db-init';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

let dbInitialized = false;

export interface IStorage {
  saveVerificationCheck(
    wikipediaUrl: string,
    refTagName: string,
    sourceText: string,
    results: Array<{
      wikipediaClaim: string;
      sourceExcerpt: string;
      confidence: number;
      supportStatus: string;
      reasoning?: string;
    }>
  ): Promise<number>;
}

export class DbStorage implements IStorage {
  async saveVerificationCheck(
    wikipediaUrl: string,
    refTagName: string,
    sourceText: string,
    results: Array<{
      wikipediaClaim: string;
      sourceExcerpt: string;
      confidence: number;
      supportStatus: string;
      reasoning?: string;
    }>
  ): Promise<number> {
    // Ensure database is initialized before first save
    if (!dbInitialized) {
      try {
        await initDatabase();
        dbInitialized = true;
      } catch (error) {
        console.error('[Storage] Failed to initialize database:', error);
        throw new Error('Database is unavailable. Please try again later.');
      }
    }

    // Insert verification check
    const [check] = await db.insert(verificationChecks).values({
      wikipediaUrl,
      refTagName,
      sourceText,
    }).returning();

    // Insert all citation results
    if (results.length > 0) {
      await db.insert(citationResults).values(
        results.map(result => ({
          checkId: check.id,
          wikipediaClaim: result.wikipediaClaim,
          sourceExcerpt: result.sourceExcerpt,
          confidence: result.confidence,
          supportStatus: result.supportStatus,
          reasoning: result.reasoning,
        }))
      );
    }

    return check.id;
  }
}

export const storage = new DbStorage();
