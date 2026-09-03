// The app's single seam onto the shared verification package.
//
// Everything that decides *whether a citation is supported* lives in
// github:alex-o-748/citation-checker-script — the prompts, the few-shot
// examples, the provider table, the model ids, the source fetch, the verdict
// parser, the quote check. This file holds none of it. It re-exports what the
// components need and adds only browser plumbing the package deliberately
// leaves to its callers: turning a pasted URL into a title, and turning
// article HTML into a DOM.
//
// If you are about to write a prompt, a model id, a fetch to an LLM, or a
// rule about what counts as supported — it belongs in the shared package, not
// here. The whole point of this app is that it cannot disagree with the
// Wikipedia userscript about a verdict.

import { collectCitations, type Citation } from "citation-checker-script/core/citations.js";
import { fetchArticleHtml } from "citation-checker-script/core/wikipedia.js";
import { buildLogPayload, newCheckId } from "citation-checker-script/core/feedback.js";
import { fetchSourceContent, logVerification } from "citation-checker-script/core/worker.js";
import { verifyCitation, VERIFY_STAGES, type VerifySuccess } from "citation-checker-script/core/pipeline.js";

export {
  PROVIDERS,
  PROVIDER_IDS,
  DEFAULT_PROVIDER,
  getProvider,
  modelFor,
  needsApiKey,
  type ProviderConfig,
} from "citation-checker-script/core/models.js";
export { VERDICTS, type Verdict } from "citation-checker-script/core/verdicts.js";
export { verifyCitation, VERIFY_STAGES, fetchSourceContent };
export type { Citation };
export type { VerifySuccess, VerifyFailure } from "citation-checker-script/core/pipeline.js";
export type { QuoteStatus } from "citation-checker-script/core/quote.js";

export interface ParsedArticleUrl {
  /** Wiki host, e.g. "en.wikipedia.org". */
  host: string;
  /** Page title with spaces, e.g. "Great Wall of China". */
  title: string;
  /** Revision pinned by ?oldid=, when the pasted URL had one. */
  revisionId: string | null;
}

/**
 * Reads a pasted Wikipedia article URL. Input parsing for the URL box, not
 * verification logic — it knows nothing about citations, sources or models.
 *
 * Accepts any Wikimedia wiki host so a user can check fr.wikipedia or
 * en.wikisource, and accepts the ?oldid= form so a check can be pinned to a
 * revision. Throws a message meant to be shown to the user.
 */
export function parseArticleUrl(raw: string): ParsedArticleUrl {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`That does not look like a URL: ${trimmed}`);
  }

  if (!/\.(wikipedia|wikisource|wikibooks|wikivoyage|wikinews)\.org$/i.test(url.hostname)) {
    throw new Error(`Enter a Wikipedia article URL (got host: ${url.hostname})`);
  }

  // Both /wiki/<Title> and /w/index.php?title=<Title> are in the wild.
  let encodedTitle: string | null = null;
  if (url.pathname.startsWith("/wiki/")) {
    encodedTitle = url.pathname.slice("/wiki/".length);
  } else if (url.searchParams.has("title")) {
    encodedTitle = url.searchParams.get("title");
  }
  if (!encodedTitle) {
    throw new Error("Could not read an article title from that URL — use the /wiki/<Title> form");
  }

  let title: string;
  try {
    title = decodeURIComponent(encodedTitle);
  } catch {
    title = encodedTitle;
  }

  return {
    host: url.hostname,
    title: title.replace(/_/g, " "),
    revisionId: url.searchParams.get("oldid"),
  };
}

export interface LoadedArticle {
  title: string;
  /** Revision the HTML was rendered from, when the response disclosed it. */
  revisionId: string | null;
  citations: Citation[];
}

/**
 * Fetches an article's rendered HTML and returns its citations.
 *
 * Both halves are the shared package's: `fetchArticleHtml` is core/wikipedia.js
 * and `collectCitations` is core/citations.js — the same function the Toolforge
 * batch pipeline uses, so a citation this app lists is a citation that pipeline
 * would list. All this adds is `DOMParser`, which the package leaves to the
 * caller because its other callers are in Node and use JSDOM.
 */
export async function loadArticleCitations(
  articleUrl: string,
  { claimScope = "paragraph" }: { claimScope?: "paragraph" | "sentence" } = {},
): Promise<LoadedArticle> {
  const parsed = parseArticleUrl(articleUrl);

  const { html, status, error } = await fetchArticleHtml(
    { title: parsed.title, revisionId: parsed.revisionId },
    { host: parsed.host },
  );

  if (!html) {
    if (status === 404) throw new Error(`No article called "${parsed.title}" on ${parsed.host}`);
    throw new Error(error || `Could not load the article (HTTP ${status ?? "?"})`);
  }

  const doc = new DOMParser().parseFromString(html, "text/html");

  return {
    title: parsed.title,
    revisionId: parsed.revisionId ?? revisionIdFromHtml(doc),
    citations: collectCitations(doc, { claimScope }),
  };
}

/**
 * Parsoid stamps the revision the HTML was rendered from onto <html about=...>
 * as a Special:Redirect/revision link. Best-effort: a wiki that stops emitting
 * it costs the log a column, not the check.
 */
function revisionIdFromHtml(doc: Document): string | null {
  const about = doc.documentElement?.getAttribute("about") ?? "";
  return /revision\/(\d+)/.exec(about)?.[1] ?? null;
}

/**
 * Records a completed check in the shared verification log, through the same
 * Worker endpoint the Wikipedia userscript posts to — so checks run here and
 * checks run from the userscript land in one table rather than two.
 *
 * Fire-and-forget by design (see core/worker.js): a logging outage must never
 * cost the user their result. Anonymous — no username, no key, no IP of ours.
 * Returns the check id, which is what a future feedback control would key on.
 */
export function logCheck(
  result: VerifySuccess,
  context: { articleUrl: string; articleTitle: string; revisionId: string | null; citationNumber: string },
): string {
  const checkId = newCheckId();
  logVerification(
    buildLogPayload({
      checkId,
      kind: "source",
      articleUrl: context.articleUrl,
      articleTitle: context.articleTitle,
      revisionId: context.revisionId,
      citationNumber: context.citationNumber,
      sourceUrl: result.sourceUrl,
      provider: result.provider,
      model: result.model,
      verdict: result.verdict,
      supportScore: result.supportScore,
      reasonType: result.reasonType,
      claimText: result.claimText,
      comments: result.comments,
      sourceQuote: result.sourceQuote,
      quoteStatus: result.quote.status,
    }),
  );
  return checkId;
}
