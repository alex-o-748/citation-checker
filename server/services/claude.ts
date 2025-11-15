import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface VerificationResult {
  confidence: number;
  reasoning: string;
  supportStatus: 'supported' | 'partially_supported' | 'not_supported';
  relevantExcerpt: string;
}

export async function verifyClaim(
  claim: string,
  sourceText: string
): Promise<VerificationResult> {
  console.log('[Claude] Verifying claim:', claim.substring(0, 100) + '...');
  
  const prompt = `You are a fact-checking assistant. Your task is to verify if a claim from a Wikipedia article is supported by a source text.

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
    const message = await anthropic.messages.create({
      claude-sonnet-4-5-20250514      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response');
    }

    const result = JSON.parse(jsonMatch[0]);

    console.log('[Claude] Verification result:', {
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
    console.error('Claude API error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Claude API key is invalid or missing');
      }
      if (error.message.includes('rate limit')) {
        throw new Error('Claude API rate limit exceeded. Please try again later');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Claude API request timed out');
      }
      throw new Error(`Claude API error: ${error.message}`);
    }
    
    throw new Error('Failed to verify claim with Claude: Unknown error');
  }
}
