import { extractUrlFromCitation } from './source-fetcher';

export interface CitationInstance {
  claim: string;
  contextBefore: string;
  contextAfter: string;
}

export interface ReferenceInfo {
  id: string;
  type: 'ref' | 'sfn';
  preview?: string;
  hasUrl?: boolean;
  fullContent?: string;
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
    const refContent = refMatch[0];

    if (!seenIds.has(refName)) {
      seenIds.add(refName);

      const instances = extractCitationInstances(wikitext, refName);
      const preview = instances.length > 0
        ? instances[0].claim.substring(0, 200) + (instances[0].claim.length > 200 ? '...' : '')
        : undefined;

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

      const instances = extractCitationInstances(wikitext, refName);
      const preview = instances.length > 0
        ? instances[0].claim.substring(0, 200) + (instances[0].claim.length > 200 ? '...' : '')
        : undefined;

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
    const refContent = unnamedMatch[0];

    unnamedCounter++;
    const refId = `__unnamed_${unnamedCounter}`;

    const instances = extractCitationInstances(wikitext, refId, refContent);
    const preview = instances.length > 0
      ? instances[0].claim.substring(0, 200) + (instances[0].claim.length > 200 ? '...' : '')
      : undefined;

    const url = extractUrlFromCitation(refContent);
    const hasUrl = url !== null;

    references.push({
      id: refId,
      type: 'ref',
      preview: preview || undefined,
      hasUrl,
      fullContent: refContent,
    });
  }

  // Extract sfn citations: {{sfn|Author|Year|...}}
  const sfnPattern = /\{\{sfn\|[^}]+\}\}/gi;
  let sfnMatch;

  while ((sfnMatch = sfnPattern.exec(wikitext)) !== null) {
    const sfnTag = sfnMatch[0];

    if (!seenIds.has(sfnTag)) {
      seenIds.add(sfnTag);

      const instances = extractCitationInstances(wikitext, sfnTag);
      const preview = instances.length > 0
        ? instances[0].claim.substring(0, 200) + (instances[0].claim.length > 200 ? '...' : '')
        : undefined;

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
  fullContent?: string
): CitationInstance[] {
  console.log('[Parser] Extracting citations for identifier:', refTagName);

  const instances: CitationInstance[] = [];
  const isSfn = refTagName.startsWith('{{sfn');
  const isUnnamedRef = refTagName.startsWith('__unnamed_');
  let pattern: RegExp;

  if (isSfn) {
    pattern = new RegExp(escapeRegExp(refTagName), 'gi');
  } else if (isUnnamedRef) {
    if (fullContent) {
      pattern = new RegExp(escapeRegExp(fullContent), 'gi');
    } else {
      console.warn('[Parser] Unnamed ref without fullContent, cannot match');
      return instances;
    }
  } else {
    pattern = new RegExp(
      `<ref\\s+name\\s*=\\s*["']?${escapeRegExp(refTagName)}["']?\\s*(?:\\/?>|>[\\s\\S]*?<\\/ref>)`,
      'gi'
    );
  }

  let match;
  while ((match = pattern.exec(wikitext)) !== null) {
    const position = match.index;

    const beforeText = wikitext.substring(0, position);
    const afterText = wikitext.substring(position + match[0].length);

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

    allRefPositions.sort((a, b) => a.start - b.start);

    let claimStart = 0;

    for (let i = allRefPositions.length - 1; i >= 0; i--) {
      const ref = allRefPositions[i];
      const textBetween = wikitext.substring(ref.end, position);

      const textBetweenTrimmed = textBetween
        .replace(/\s+/g, '')
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
        .replace(/<ref[^>]*\/>/g, '')
        .replace(/\{\{sfn[^}]*\}\}/g, '');

      if (textBetweenTrimmed.length > 0) {
        claimStart = ref.end;
        break;
      }
    }

    if (claimStart === 0) {
      for (let i = position - 1; i >= 0; i--) {
        const char = wikitext[i];

        if (char === '\n' && i > 0 && wikitext[i - 1] === '\n') {
          claimStart = i + 1;
          break;
        }

        if (char === '\n' && i < wikitext.length - 1) {
          const nextChar = wikitext[i + 1];
          if (nextChar === '=' || nextChar === '*' || nextChar === '#' || nextChar === ':') {
            claimStart = i + 1;
            break;
          }
        }

        if (char === '=' && (i === 0 || wikitext[i - 1] === '\n')) {
          claimStart = i;
          break;
        }
      }
    }

    const rawClaim = beforeText.substring(claimStart);

    const claim = rawClaim
      .trim()
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
      .replace(/<ref[^>]*\/>/gi, '')
      .replace(/<\/?ref[^>]*>/gi, '')
      .replace(/\{\{sfn[^}]*\}\}/g, '')
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (match, p1, p2) => p2 || p1)
      .replace(/'{2,}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (claim && claim.length > 10) {
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
