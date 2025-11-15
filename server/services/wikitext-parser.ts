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
  const refPattern = new RegExp(
    `<ref\\s+name\\s*=\\s*["']${escapeRegExp(refTagName)}["']\\s*(?:\\/?>|>[\\s\\S]*?<\\/ref>)`,
    'gi'
  );

  let match;
  while ((match = refPattern.exec(wikitext)) !== null) {
    const position = match.index;

    console.log(`[Parser] Found citation at position ${position}`);

    // Extract the claim - scan backwards from ref tag until we hit a boundary
    const beforeText = wikitext.substring(0, position);
    const afterText = wikitext.substring(position + match[0].length);

    // First, find all ref tag positions before our target position
    const allRefPositions: Array<{start: number, end: number}> = [];
    const allRefPattern = /<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>/gi;
    let refMatch;

    while ((refMatch = allRefPattern.exec(wikitext)) !== null) {
      if (refMatch.index + refMatch[0].length < position) {
        allRefPositions.push({
          start: refMatch.index,
          end: refMatch.index + refMatch[0].length
        });
      }
    }

    console.log(`[Parser] Found ${allRefPositions.length} ref tags before target position`);

    // Now find where the claim starts by looking backwards through refs and other boundaries
    let claimStart = 0;

    // Check refs from most recent backwards
    for (let i = allRefPositions.length - 1; i >= 0; i--) {
      const ref = allRefPositions[i];
      const textBetween = wikitext.substring(ref.end, position);

      // Remove only whitespace to check if there's actual text
      const textBetweenTrimmed = textBetween.replace(/\s+/g, '');

      if (textBetweenTrimmed.length > 0) {
        // There's actual text between this ref and our target
        // This ref is a boundary
        claimStart = ref.end;
        console.log(`[Parser] Found text between previous ref and target, claim starts at ${claimStart}`);
        break;
      }
      // No text between refs, so they cite the same claim
      // Keep looking backwards
      console.log(`[Parser] No text between ref at ${ref.end} and target, continuing search`);
    }

    // If we didn't find a ref boundary, look for other boundaries (paragraph, section)
    if (claimStart === 0) {
      console.log('[Parser] No ref boundary found, looking for paragraph/section boundaries');

      // Scan backwards from position to find paragraph or section boundaries
      for (let i = position - 1; i >= 0; i--) {
        const char = wikitext[i];

        // Check for paragraph break (double newline)
        if (char === '\n' && i > 0 && wikitext[i - 1] === '\n') {
          claimStart = i + 1;
          console.log(`[Parser] Found paragraph break at ${claimStart}`);
          break;
        }

        // Check for single newline followed by wiki markup
        if (char === '\n' && i < wikitext.length - 1) {
          const nextChar = wikitext[i + 1];
          if (nextChar === '=' || nextChar === '*' || nextChar === '#' || nextChar === ':') {
            claimStart = i + 1;
            console.log(`[Parser] Found newline with markup at ${claimStart}`);
            break;
          }
        }

        // Check for section start (equals signs for headers)
        if (char === '=' && (i === 0 || wikitext[i - 1] === '\n')) {
          claimStart = i;
          console.log(`[Parser] Found section header at ${claimStart}`);
          break;
        }
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
      .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (match, p1, p2) => p2 || p1) // Convert wiki links [[Link|Text]] to Text or just Link
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
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '') // Remove ref tags with content
    .replace(/<ref[^>]*\/>/gi, '') // Remove self-closing ref tags
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (match, p1, p2) => p2 || p1) // Convert wiki links
    .replace(/'{2,}/g, '') // Remove bold/italic
    .replace(/\{\{[^}]+\}\}/g, '') // Remove templates
    .replace(/\s+/g, ' ')
    .trim();
}