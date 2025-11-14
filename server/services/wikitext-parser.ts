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
  
  // Helper function to check if /> is part of a ref tag
  const isRefSelfClosing = (text: string, slashPos: number): boolean => {
    let checkPos = slashPos - 1;
    while (checkPos >= 0 && text[checkPos] !== '<' && text[checkPos] !== '>') {
      checkPos--;
    }
    return checkPos >= 0 && text[checkPos] === '<' && text.substring(checkPos, checkPos + 4) === '<ref';
  };
  
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
    
    // Extract the claim - scan backwards from ref tag until we hit a boundary
    // A citation may support multiple sentences
    const beforeText = wikitext.substring(0, position);
    const afterText = wikitext.substring(position + match[0].length);

    // Scan backwards to find where the supported text starts
    // Skip over consecutive ref tags (multiple citations on the same text)
    let claimStart = 0;
    let hasSeenText = false; // Track if we've encountered non-whitespace text
    
    for (let i = position - 1; i >= 0; i--) {
      const char = wikitext[i];
      
      // Track if we've seen actual text (not whitespace)
      if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
        // Check if this non-whitespace is part of a ref tag
        const isPartOfRefTag = 
          wikitext.substring(i, i + 6) === '</ref>' ||
          (wikitext.substring(i, i + 2) === '/>' && i >= 4 && isRefSelfClosing(wikitext, i)) ||
          (char === '<' && wikitext.substring(i, i + 4) === '<ref');
        
        if (!isPartOfRefTag) {
          hasSeenText = true;
        }
      }
      
      // Check for previous ref tag (closing tag)
      if (wikitext.substring(i, i + 6) === '</ref>') {
        // Only stop if we've seen actual text between this ref and our target
        if (hasSeenText) {
          claimStart = i + 6; // Start after the closing tag
          break;
        }
        // Skip this ref tag and continue scanning
        i -= 5; // Skip the rest of </ref>
        continue;
      }
      
      // Check for previous ref tag (self-closing)
      if (wikitext.substring(i, i + 2) === '/>' && i >= 4) {
        if (isRefSelfClosing(wikitext, i)) {
          // Only stop if we've seen actual text between this ref and our target
          if (hasSeenText) {
            claimStart = i + 2; // Start after the self-closing tag
            break;
          }
          // Skip backwards to the start of this ref tag
          let checkPos = i - 1;
          while (checkPos >= 0 && wikitext[checkPos] !== '<') {
            checkPos--;
          }
          i = checkPos; // Continue from before the ref tag
          continue;
        }
      }
      
      // Check for paragraph break (newline)
      if (char === '\n') {
        claimStart = i + 1;
        break;
      }
      
      // Check for section start (equals signs for headers)
      if (char === '=' && (i === 0 || wikitext[i - 1] === '\n')) {
        claimStart = i;
        break;
      }
    }

    // Extract the claim text
    const rawClaim = beforeText.substring(claimStart);
    console.log(`[Parser] Claim start: ${claimStart}, Ref tag position: ${position}`);
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
