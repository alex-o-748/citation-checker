import axios from 'axios';

// Ollama cloud API - OpenAI compatible endpoint
const OLLAMA_API_URL = 'https://ollama.com/v1';
const DEFAULT_MODEL = 'gemini-3-flash-preview';

export interface VerificationResult {
  confidence: number;
  reasoning: string;
  supportStatus: 'supported' | 'partially_supported' | 'not_supported';
  relevantExcerpt: string;
}

export async function verifyClaim(
  claim: string,
  sourceText: string,
  apiKey?: string // Optional - Ollama free tier doesn't require auth
): Promise<VerificationResult> {
  console.log('[Ollama] Verifying claim with model:', DEFAULT_MODEL);
  console.log('[Ollama] Claim preview:', claim.substring(0, 100) + '...');

  const prompt = `You are a fact-checking assistant. Your task is to verify if a claim from a Wikipedia article is supported by a source text.

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

Respond ONLY with valid JSON, no markdown formatting or code blocks:
{
  "confidence": <number 0-100>,
  "relevantExcerpt": "<exact quote from source>",
  "reasoning": "<brief explanation>",
  "supportStatus": "<supported|partially_supported|not_supported>"
}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth header if API key provided (for authenticated usage)
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await axios.post(
      `${OLLAMA_API_URL}/chat/completions`,
      {
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        temperature: 0.3,
      },
      {
        headers,
        timeout: 90000, // 90 second timeout
      }
    );

    const responseText = response.data.choices?.[0]?.message?.content || '';
    console.log('[Ollama] Raw response:', responseText.substring(0, 200));

    // Extract JSON from the response
    let jsonStr = responseText;

    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find raw JSON object
      const rawJsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (rawJsonMatch) {
        jsonStr = rawJsonMatch[0];
      }
    }

    const result = JSON.parse(jsonStr);

    console.log('[Ollama] Verification result:', {
      confidence: result.confidence,
      supportStatus: result.supportStatus,
    });

    return {
      confidence: Math.min(100, Math.max(0, result.confidence)),
      reasoning: result.reasoning || '',
      supportStatus: result.supportStatus || 'not_supported',
      relevantExcerpt: result.relevantExcerpt || 'No relevant excerpt found',
    };
  } catch (error) {
    console.error('[Ollama] API error:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (status === 401 || status === 403) {
        throw new Error('Ollama API authentication failed');
      }
      if (status === 429) {
        throw new Error('Ollama rate limit exceeded. Please try again later.');
      }
      if (status === 404) {
        throw new Error(`Model "${DEFAULT_MODEL}" not available. Service may be temporarily unavailable.`);
      }
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('Ollama API request timed out. Please try again.');
      }

      const errorMessage = errorData?.error?.message || errorData?.error || error.message;
      throw new Error(`Ollama API error: ${errorMessage}`);
    }

    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse Ollama response as JSON');
    }

    throw new Error('Failed to verify claim with Ollama: Unknown error');
  }
}