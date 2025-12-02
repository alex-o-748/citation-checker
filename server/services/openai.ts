import OpenAI from 'openai';

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
  const openai = new OpenAI({
    apiKey: apiKey.trim(),
  });
  
  console.log('[OpenAI] Verifying claim:', claim.substring(0, 100) + '...');
  
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

Respond in JSON format:
{
  "confidence": <number 0-100>,
  "relevantExcerpt": "<exact quote from source>",
  "reasoning": "<brief explanation>",
  "supportStatus": "<supported|partially_supported|not_supported>"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '';

    const result = JSON.parse(responseText);

    console.log('[OpenAI] Verification result:', {
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
    console.error('OpenAI API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Incorrect API key')) {
        throw new Error('OpenAI API key is invalid or missing');
      }
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later');
      }
      if (error.message.includes('timeout')) {
        throw new Error('OpenAI API request timed out');
      }
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    
    throw new Error('Failed to verify claim with OpenAI: Unknown error');
  }
}
