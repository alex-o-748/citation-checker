  import { extractUrlFromCitation } from './source-fetcher';

  export interface CitationInstance {
    claim: string;
    contextBefore: string;
    contextAfter: string;
  }


  export interface ReferenceInfo {
    id: string;
    type: 'ref' | 'sfn';
    preview?: string; // Optional preview of where it's used
    hasUrl?: boolean;
    fullContent?: string; // Full ref tag (for unnamed refs, so we can extract URL)
  }

  /**
   * Extract all unique references from wikitext
   */
  export function listAllReferences(wikitext: string): ReferenceInfo[] {
    console.log('[Parser] Extracting all references from article');

    const references: ReferenceInfo[] = [];
    const seenIds = new Set<string>();

    // Extract named ref tags with content: <ref name="identifier">content</ref>
    const refWithContentPattern = /<ref\s+name\s*=\s*["']?([^"'\s>\/]+)["']?\s*>([\s\S]*?)<\/ref>/gi;
    let refMatch;

    while ((refMatch = refWithContentPattern.exec(wikitext)) !== null) {
      const refName = refMatch[1];
      const refContent = refMatch[0];  // Full tag including content

      if (!seenIds.has(refName)) {
        seenIds.add(refName);

        console.log('[Parser] Full ref content:', refContent.substring(0, 300));

        // Try to get a preview of the content before this ref
        const position = refMatch.index;
        const beforeText = wikitext.substring(Math.max(0, position - 100), position);
        const preview = cleanWikitext(beforeText).slice(-80).trim();

        // Reuse existing URL extraction logic
        const url = extractUrlFromCitation(refContent);
        const hasUrl = url !== null;

        references.push({
          id: refName,
          type: 'ref',
          preview: preview || undefined,
          hasUrl,
        });
      }
    }

    // Extract self-closing ref tags: <ref name="identifier" />
    const refSelfClosingPattern = /<ref\s+name\s*=\s*["']?([^"'\s>\/]+)["']?\s*\/>/gi;

    while ((refMatch = refSelfClosingPattern.exec(wikitext)) !== null) {
      const refName = refMatch[1];

      if (!seenIds.has(refName)) {
        seenIds.add(refName);

        // Try to get a preview of the content before this ref
        const position = refMatch.index;
        const beforeText = wikitext.substring(Math.max(0, position - 100), position);
        const preview = cleanWikitext(beforeText).slice(-80).trim();

        // Self-closing refs have no content, so no URL
        references.push({
          id: refName,
          type: 'ref',
          preview: preview || undefined,
          hasUrl: false,
        });
      }
    }

    // Extract unnamed/plain ref tags: <ref>content</ref> (no name attribute)
    const unnamedRefPattern = /<ref(?!\s+name)(?:\s+[^>]*)?>([\s\S]*?)<\/ref>/gi;
    let unnamedMatch;
    let unnamedCounter = 0;

    while ((unnamedMatch = unnamedRefPattern.exec(wikitext)) !== null) {
      const refContent = unnamedMatch[0];  // Full tag including content

      unnamedCounter++;
      const refId = `__unnamed_${unnamedCounter}`;

      // Try to get a preview of the content before this ref
      const position = unnamedMatch.index;
      const beforeText = wikitext.substring(Math.max(0, position - 100), position);
      const preview = cleanWikitext(beforeText).slice(-80).trim();

      // Check if the ref content has a URL
      const url = extractUrlFromCitation(refContent);
      const hasUrl = url !== null;

      references.push({
        id: refId,
        type: 'ref',
        preview: preview || undefined,
        hasUrl,
        fullContent: refContent,  // Store full content for URL extraction
      });
    }

    // Extract sfn citations: {{sfn|Author|Year|...}}
    const sfnPattern = /\{\{sfn\|[^}]+\}\}/gi;
    let sfnMatch;

    while ((sfnMatch = sfnPattern.exec(wikitext)) !== null) {
      const sfnTag = sfnMatch[0];

      if (!seenIds.has(sfnTag)) {
        seenIds.add(sfnTag);

        // Try to get a preview of the content before this sfn
        const position = sfnMatch.index;
        const beforeText = wikitext.substring(Math.max(0, position - 100), position);
        const preview = cleanWikitext(beforeText).slice(-80).trim();

        references.push({
          id: sfnTag,
          type: 'sfn',
          preview: preview || undefined,
          hasUrl: false,
        });
      }
    }

    console.log(`[Parser] Found ${references.length} unique references (including ${unnamedCounter} unnamed refs)`);

    return references;
  }

export function extractCitationInstances(
  wikitext: string,
  refTagName: string,
  fullContent?: string  // For unnamed refs
  ): CitationInstance[] {
    console.log('[Parser] Extracting citations for identifier:', refTagName);

    const instances: CitationInstance[] = [];

    // Check if this is an sfn citation (starts with {{sfn)
    const isSfn = refTagName.startsWith('{{sfn');

    // Check if this is an unnamed ref (starts with <ref> without name=)
    const isUnnamedRef = refTagName.startsWith('__unnamed_');
    let pattern: RegExp;

    if (isSfn) {
      // For sfn, match the exact citation template
      pattern = new RegExp(escapeRegExp(refTagName), 'gi');
    } else if (isUnnamedRef) {
      // For unnamed refs, use fullContent to find the exact ref in wikitext
      if (fullContent) {
        pattern = new RegExp(escapeRegExp(fullContent), 'gi');
      } else {
        console.warn('[Parser] Unnamed ref without fullContent, cannot match');
        return instances;
      }
    } else {
      // Named ref tag pattern
      pattern = new RegExp(
        `<ref\\s+name\\s*=\\s*["']?${escapeRegExp(refTagName)}["']?\\s*(?:\\/?>|>[\\s\\S]*?<\\/ref>)`,
        'gi'
      );
    }

    let match;
    while ((match = pattern.exec(wikitext)) !== null) {
      const position = match.index;

      console.log(`[Parser] Found citation at position ${position}`);

      // Extract the claim - scan backwards from ref tag until we hit a boundary
      const beforeText = wikitext.substring(0, position);
      const afterText = wikitext.substring(position + match[0].length);

      // First, find all citation positions before our target position (both ref tags and sfn)
      const allRefPositions: Array<{start: number, end: number}> = [];
      const allRefPattern = /<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/gi;
      const allSfnPattern = /\{\{sfn[^}]*\}\}/gi;

      let refMatch;
      while ((refMatch = allRefPattern.exec(wikitext)) !== null) {
        if (refMatch.index + refMatch[0].length < position) {
          allRefPositions.push({
            start: refMatch.index,
            end: refMatch.index + refMatch[0].length
          });
        }
      }

      let sfnMatch;
      while ((sfnMatch = allSfnPattern.exec(wikitext)) !== null) {
        if (sfnMatch.index + sfnMatch[0].length < position) {
          allRefPositions.push({
            start: sfnMatch.index,
            end: sfnMatch.index + sfnMatch[0].length
          });
        }
      }

      // Sort by position
      allRefPositions.sort((a, b) => a.start - b.start);

      console.log(`[Parser] Found ${allRefPositions.length} citations before target position`);

      // Now find where the claim starts by looking backwards through refs and other boundaries
      let claimStart = 0;

      // Check refs from most recent backwards
      for (let i = allRefPositions.length - 1; i >= 0; i--) {
        const ref = allRefPositions[i];
        const textBetween = wikitext.substring(ref.end, position);

        // Remove whitespace AND other citations to check if there's actual text
        const textBetweenTrimmed = textBetween
          .replace(/\s+/g, '')
          .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
          .replace(/<ref[^>]*\/>/g, '')
          .replace(/\{\{sfn[^}]*\}\}/g, '');

        if (textBetweenTrimmed.length > 0) {
          // There's actual text between this ref and our target
          // This ref is a boundary
          claimStart = ref.end;
          console.log(`[Parser] Found text between previous citation and target, claim starts at ${claimStart}`);
          break;
        }
        // No text between refs, so they cite the same claim
        // Keep looking backwards
        console.log(`[Parser] No text between citation at ${ref.end} and target, continuing search`);
      }

      // If we didn't find a ref boundary, look for other boundaries (paragraph, section)
      if (claimStart === 0) {
        console.log('[Parser] No citation boundary found, looking for paragraph/section boundaries');

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
      console.log(`[Parser] Claim start: ${claimStart}, Citation position: ${position}`);
      console.log('[Parser] Raw claim before cleaning:', rawClaim.substring(0, 200));

      const claim = rawClaim
        .trim()
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '') // Remove ref tags with content (multi-line)
        .replace(/<ref[^>]*\/>/gi, '') // Remove self-closing ref tags
        .replace(/<\/?ref[^>]*>/gi, '') // Remove any remaining ref tag fragments
        .replace(/\{\{sfn[^}]*\}\}/g, '') // Remove sfn citations
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
      .replace(/\{\{sfn[^}]*\}\}/g, '') // Remove sfn citations
      .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (match, p1, p2) => p2 || p1) // Convert wiki links
      .replace(/'{2,}/g, '') // Remove bold/italic
      .replace(/\{\{[^}]+\}\}/g, '') // Remove templates
      .replace(/\s+/g, ' ')
      .trim();
  }