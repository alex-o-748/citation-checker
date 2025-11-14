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
    
    // Extract the claim - everything from the sentence start up to the ref tag
    // Citations mark the END of a claim, so we don't include text after the ref tag
    const beforeText = wikitext.substring(0, position);
    const afterText = wikitext.substring(position + match[0].length);

    // Find sentence start - simplified approach
    // Just look backwards for the last period that's NOT inside a <ref>...</ref> tag
    let sentenceStart = 0;
    
    // First, remove all ref tags from beforeText to find sentence boundaries
    const beforeTextClean = beforeText
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ') // Replace ref tags with space
      .replace(/<ref[^>]*\/>/gi, ' '); // Replace self-closing refs with space
    
    // Find the last period in the cleaned text
    const lastPeriod = beforeTextClean.lastIndexOf('.');
    const lastExclamation = beforeTextClean.lastIndexOf('!');
    const lastQuestion = beforeTextClean.lastIndexOf('?');
    const lastNewline = beforeTextClean.lastIndexOf('\n');
    
    const lastBoundary = Math.max(lastPeriod, lastExclamation, lastQuestion, lastNewline);
    
    if (lastBoundary >= 0) {
      sentenceStart = lastBoundary + 1;
      // Skip whitespace
      while (sentenceStart < beforeText.length && /\s/.test(beforeText[sentenceStart])) {
        sentenceStart++;
      }
    }

    // Extract only the text BEFORE the ref tag (from sentence start to ref tag position)
    const rawClaim = beforeText.substring(sentenceStart);
    console.log(`[Parser] Sentence start: ${sentenceStart}, Ref tag position: ${position}`);
    console.log('[Parser] Raw claim before cleaning:', rawClaim.substring(0, 200));
    
    const claim = rawClaim
      .trim()
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '') // Remove ref tags with content (multi-line)
      .replace(/<ref[^>]*\/>/gi, '') // Remove self-closing ref tags
      .replace(/<\/?ref[^>]*>/gi, '') // Remove any remaining ref tag fragments
      .replace(/\{\{[^}]*\}\}/g, '') // Remove wiki templates like {{Lang|...}}
      .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2') // Convert wiki links [[Link|Text]] to Text
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // Convert simple wiki links
      .replace(/'{2,}/g, '') // Remove bold/italic markup
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    console.log('[Parser] Cleaned claim:', claim.substring(0, 150) + '...');

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
