export interface VerificationResult {
  confidence: number;
  reasoning: string;
  supportStatus: 'supported' | 'partially_supported' | 'not_supported';
  relevantExcerpt: string;
}

export type AIProvider = 'publicai' | 'ollama' | 'claude' | 'openai' | 'gemini';

const VERIFICATION_PROMPT = (claim: string, sourceText: string) => `You are a fact-checking assistant. Your task is to verify if a claim from a Wikipedia article is supported by a source text.

CRITICAL: Distinguish between definitive statements and uncertain/hedged language. Claims stated as facts require sources that make definitive statements, not speculation or tentative assertions.

EXAMPLES:

Claim: "The battle occurred on June 15, 1944"
Source: "The battle took place on June 15, 1944"
Result: confidence: 95, supportStatus: "supported" (definitive match)

Claim: "The treaty was signed in Paris"
Source: "It is believed the treaty was signed in Paris, though some historians dispute this"
Result: confidence: 60, supportStatus: "partially_supported" (uncertainty and dispute)

Claim: "The president resigned on March 3"
Source: "The president remained in office throughout March"
Result: confidence: 5, supportStatus: "not_supported" (contradicts claim)

CLAIM from Wikipedia:
"${claim}"

SOURCE TEXT:
${sourceText}

Analyze whether the source text supports this claim. Provide:
1. A confidence score (0-100) indicating how well the source supports the claim
2. The specific excerpt from the source that is most relevant to the claim
3. Brief reasoning for your confidence score
4. A status: "supported" (80%+), "partially_supported" (50-79%), or "not_supported" (<50%)

Respond ONLY with valid JSON (no markdown code blocks):
{
  "confidence": <number 0-100>,
  "relevantExcerpt": "<exact quote from source>",
  "reasoning": "<brief explanation>",
  "supportStatus": "<supported|partially_supported|not_supported>"
}`;

function parseVerificationResponse(responseText: string): VerificationResult {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    confidence: Math.min(100, Math.max(0, parsed.confidence)),
    reasoning: parsed.reasoning || '',
    supportStatus: parsed.supportStatus || 'not_supported',
    relevantExcerpt: parsed.relevantExcerpt || 'No relevant excerpt found',
  };
}

export async function verifyWithPublicAI(
  claim: string,
  sourceText: string,
  apiKey: string
): Promise<VerificationResult> {
  console.log('[Public.ai] Verifying claim:', claim.substring(0, 100) + '...');

  const response = await fetch('https://api.publicai.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
      'User-Agent': 'WikiCiteVerify/1.0',
    },
    body: JSON.stringify({
      model: 'swiss-ai/apertus-8b-instruct',
      messages: [{ role: 'user', content: VERIFICATION_PROMPT(claim, sourceText) }],
      temperature: 0.8,
      top_p: 0.9,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Public.ai API key is invalid');
    }
    if (response.status === 429) {
      throw new Error('Public.ai rate limit exceeded (20 requests/min). Please try again in a minute');
    }
    throw new Error(`Public.ai API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const responseText = data.choices[0]?.message?.content || '';

  return parseVerificationResponse(responseText);
}

export async function verifyWithOllama(
  claim: string,
  sourceText: string,
  apiKey: string
): Promise<VerificationResult> {
  console.log('[Ollama] Verifying claim:', claim.substring(0, 100) + '...');

  const response = await fetch('https://api.ollama.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'llama2',
      messages: [{ role: 'user', content: VERIFICATION_PROMPT(claim, sourceText) }],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const responseText = data.choices[0]?.message?.content || '';

  return parseVerificationResponse(responseText);
}

export async function verifyWithClaude(
  claim: string,
  sourceText: string,
  apiKey: string
): Promise<VerificationResult> {
  console.log('[Claude] Verifying claim:', claim.substring(0, 100) + '...');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: VERIFICATION_PROMPT(claim, sourceText) }],
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Claude API key is invalid');
    }
    if (response.status === 429) {
      throw new Error('Claude rate limit exceeded. Please try again later');
    }
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const responseText = data.content[0]?.text || '';

  return parseVerificationResponse(responseText);
}

export async function verifyWithOpenAI(
  claim: string,
  sourceText: string,
  apiKey: string
): Promise<VerificationResult> {
  console.log('[OpenAI] Verifying claim:', claim.substring(0, 100) + '...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: VERIFICATION_PROMPT(claim, sourceText) }],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('OpenAI API key is invalid');
    }
    if (response.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later');
    }
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const responseText = data.choices[0]?.message?.content || '';

  return parseVerificationResponse(responseText);
}

export async function verifyWithGemini(
  claim: string,
  sourceText: string,
  apiKey: string
): Promise<VerificationResult> {
  console.log('[Gemini] Verifying claim:', claim.substring(0, 100) + '...');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: VERIFICATION_PROMPT(claim, sourceText) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Gemini API key is invalid');
    }
    if (response.status === 429) {
      throw new Error('Gemini rate limit exceeded. Please try again later');
    }
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return parseVerificationResponse(responseText);
}

export async function verifyClaim(
  claim: string,
  sourceText: string,
  apiKey: string | undefined,
  provider: AIProvider,
  env: { PUBLICAI_API_KEY?: string; OLLAMA_API_KEY?: string }
): Promise<VerificationResult> {
  switch (provider) {
    case 'publicai':
      const publicAiKey = env.PUBLICAI_API_KEY;
      if (!publicAiKey) {
        throw new Error('Public.ai API key not configured on server');
      }
      return verifyWithPublicAI(claim, sourceText, publicAiKey);
    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key is required');
      return verifyWithOpenAI(claim, sourceText, apiKey.trim());
    case 'gemini':
      if (!apiKey) throw new Error('Gemini API key is required');
      return verifyWithGemini(claim, sourceText, apiKey.trim());
    case 'claude':
      if (!apiKey) throw new Error('Claude API key is required');
      return verifyWithClaude(claim, sourceText, apiKey.trim());
    case 'ollama':
      const ollamaKey = env.OLLAMA_API_KEY;
      if (!ollamaKey) {
        throw new Error('Ollama API key not configured on server');
      }
      return verifyWithOllama(claim, sourceText, ollamaKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
