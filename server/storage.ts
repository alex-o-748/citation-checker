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

let sql: ReturnType<typeof neon> | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let dbInitialized = false;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql);
  }

  return db!;
}

export interface IStorage {
  saveVerificationCheck(
    wikipediaUrl: string,
    refTagName: string,
    sourceText: string,
    sourceUrl: string | undefined,
    aiProvider: string,
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
    sourceUrl: string | undefined,
    aiProvider: string,
    results: Array<{
      wikipediaClaim: string;
      sourceExcerpt: string;
      confidence: number;
      supportStatus: string;
      reasoning?: string;
    }>
  ): Promise<number> {
    // Get database connection (will throw if DATABASE_URL is not set)
    const database = getDb();

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
    const [check] = await database.insert(verificationChecks).values({
      wikipediaUrl,
      refTagName,
      sourceText,
      sourceUrl,
      aiProvider,
    }).returning();

    // Insert all citation results
    if (results.length > 0) {
      await database.insert(citationResults).values(
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