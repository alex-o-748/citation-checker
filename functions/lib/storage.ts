import { neon } from '@neondatabase/serverless';

export interface CitationResultInput {
  wikipediaClaim: string;
  sourceExcerpt: string;
  confidence: number;
  supportStatus: string;
  reasoning?: string;
}

export async function saveVerificationCheck(
  databaseUrl: string,
  wikipediaUrl: string,
  refTagName: string,
  sourceText: string,
  sourceUrl: string | undefined,
  aiProvider: string,
  results: CitationResultInput[]
): Promise<number> {
  const sql = neon(databaseUrl);

  // Ensure tables exist
  await sql`
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

  // Insert verification check
  const [check] = await sql`
    INSERT INTO verification_checks (wikipedia_url, ref_tag_name, source_text, source_url, ai_provider)
    VALUES (${wikipediaUrl}, ${refTagName}, ${sourceText}, ${sourceUrl || null}, ${aiProvider})
    RETURNING id
  `;

  // Insert all citation results
  if (results.length > 0) {
    for (const result of results) {
      await sql`
        INSERT INTO citation_results (check_id, wikipedia_claim, source_excerpt, confidence, support_status, reasoning)
        VALUES (${check.id}, ${result.wikipediaClaim}, ${result.sourceExcerpt}, ${result.confidence}, ${result.supportStatus}, ${result.reasoning || null})
      `;
    }
  }

  return check.id;
}
