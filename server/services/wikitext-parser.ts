export interface CitationInstance {
  claim: string;
  contextBefore: string;
  contextAfter: string;
}

export function extractCitationInstances(
  wikitext: string,
  refTagName: string
): CitationInstance[] {
  console.log('[Parser] Extracting citations for ref tag:', refTagName);
  
  const instances: CitationInstance[] = [];

  // Pattern to find ref tag usage:
  // - Self-closing: <ref name="tagname" />
  // - Paired with content (potentially multi-line): <ref name="tagname">...</ref>
  // - Reused reference: <ref name="tagname" />
  // Use [\s\S] to match any character including newlines
  const refPattern = new RegExp(
    `<ref\\s+name\\s*=\\s*["']${escapeRegExp(refTagName)}["']\\s*(?:\\/?>|>[\\s\\S]*?<\\/ref>)`,
    'gi'
  );

  let match;
  while ((match = refPattern.exec(wikitext)) !== null) {
    const position = match.index;
    
    // Extract context around the citation
    // We'll go back to find the start of the sentence and forward to find the end
    const beforeText = wikitext.substring(0, position);
    const afterText = wikitext.substring(position + match[0].length);

    // Find the sentence containing the citation
    // Look backwards for sentence boundary (. ! ? or start of paragraph)
    const sentenceStartMatch = beforeText.match(/[.!?]\s*[^\n]*$/);
    const sentenceStart = sentenceStartMatch 
      ? beforeText.length - sentenceStartMatch[0].length + sentenceStartMatch[0].indexOf('.') + 1
      : Math.max(0, beforeText.lastIndexOf('\n') + 1);

    // Look forwards for sentence boundary
    const sentenceEndMatch = afterText.match(/^[^.!?\n]*[.!?]/);
    const sentenceEnd = sentenceEndMatch 
      ? sentenceEndMatch[0].length
      : afterText.indexOf('\n') !== -1 
        ? afterText.indexOf('\n')
        : Math.min(200, afterText.length);

    const claim = (beforeText.substring(sentenceStart) + afterText.substring(0, sentenceEnd))
      .trim()
      .replace(/<ref[^>]*>/gi, '') // Remove ref tags from the claim
      .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2') // Convert wiki links [[Link|Text]] to Text
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // Convert simple wiki links
      .replace(/'{2,}/g, '') // Remove bold/italic markup
      .replace(/\s+/g, ' '); // Normalize whitespace

    if (claim && claim.length > 10) { // Only include meaningful claims
      instances.push({
        claim,
        contextBefore: beforeText.substring(Math.max(0, beforeText.length - 150)).trim(),
        contextAfter: afterText.substring(0, Math.min(150, afterText.length)).trim(),
      });
    }
  }

  console.log(`[Parser] Found ${instances.length} citation instances`);
  
  return instances;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cleanWikitext(text: string): string {
  return text
    .replace(/<ref[^>]*>.*?<\/ref>/gi, '') // Remove ref tags with content
    .replace(/<ref[^>]*\/>/gi, '') // Remove self-closing ref tags
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2') // Convert wiki links
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '') // Remove bold/italic
    .replace(/\{\{[^}]+\}\}/g, '') // Remove templates
    .replace(/\s+/g, ' ')
    .trim();
}
