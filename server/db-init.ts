import { neon } from '@neondatabase/serverless';

let sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }

  return sql;
}

export async function initDatabase() {
  try {
    console.log('[Database] Initializing database tables...');

    const database = getSql();

    // Create verification_checks table
    await database`
      CREATE TABLE IF NOT EXISTS verification_checks (
        id SERIAL PRIMARY KEY,
        wikipedia_url TEXT NOT NULL,
        ref_tag_name TEXT NOT NULL,
        source_text TEXT NOT NULL,
        source_url TEXT,
        ai_provider VARCHAR(50) NOT NULL DEFAULT 'publicai',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Add ai_provider column if it doesn't exist (migration for existing databases)
    await database`
      ALTER TABLE verification_checks
      ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) NOT NULL DEFAULT 'publicai'
    `;

    // Create citation_results table
    await database`
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