import axios from 'axios';

export interface VerificationResult {
  confidence: number;
  reasoning: string;
  supportStatus: 'supported' | 'partially_supported' | 'not_supported';
  relevantExcerpt: string;
}

export async function verifyClaim(
  claim: string,
  sourceText: string,
  apiKey: string
): Promise<VerificationResult> {
  console.log('[Public.ai] Verifying claim:', claim.substring(0, 100) + '...');
  
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

Respond ONLY with valid JSON (no markdown code blocks):
{
  "confidence": <number 0-100>,
  "relevantExcerpt": "<exact quote from source>",
  "reasoning": "<brief explanation>",
  "supportStatus": "<supported|partially_supported|not_supported>"
}`;

  try {
    const response = await axios.post(
      'https://api.publicai.co/v1/chat/completions',
      {
        model: 'swiss-ai/apertus-8b-instruct',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        top_p: 0.9,
        max_tokens: 1024,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'User-Agent': 'WikiCiteVerify/1.0',
        },
        timeout: 60000,
      }
    );

    const responseText = response.data.choices[0]?.message?.content || '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Public.ai response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    console.log('[Public.ai] Verification result:', {
      confidence: parsed.confidence,
      supportStatus: parsed.supportStatus,
    });

    return {
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning || '',
      supportStatus: parsed.supportStatus || 'not_supported',
      relevantExcerpt: parsed.relevantExcerpt || 'No relevant excerpt found',
    };
  } catch (error) {
    console.error('Public.ai API error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Public.ai API key is invalid');
      }
      if (error.response?.status === 429) {
        throw new Error('Public.ai rate limit exceeded (20 requests/min). Please try again in a minute');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Public.ai API request timed out');
      }
      throw new Error(`Public.ai API error: ${error.response?.data?.error?.message || error.message}`);
    }
    
    if (error instanceof Error) {
      throw new Error(`Public.ai API error: ${error.message}`);
    }
    
    throw new Error('Failed to verify claim with Public.ai: Unknown error');
  }
}
