import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function initDatabase() {
  try {
    console.log('[Database] Initializing database tables...');
    
    // Create verification_checks table
    await sql`
      CREATE TABLE IF NOT EXISTS verification_checks (
        id SERIAL PRIMARY KEY,
        wikipedia_url TEXT NOT NULL,
        ref_tag_name TEXT NOT NULL,
        source_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    
    // Create citation_results table
    await sql`
      CREATE TABLE IF NOT EXISTS citation_results (
        id SERIAL PRIMARY KEY,
        check_id INTEGER NOT NULL REFERENCES verification_checks(id),
        wikipedia_claim TEXT NOT NULL,
        source_excerpt TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        support_status VARCHAR(50) NOT NULL,
        reasoning TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    
    console.log('[Database] Database tables initialized successfully');
  } catch (error) {
    console.error('[Database] Failed to initialize database:', error);
    throw error;
  }
}
