// Hand-written types for the shared verification package
// (github:alex-o-748/citation-checker-script). That repo is plain ESM
// JavaScript and ships no .d.ts of its own, so these declarations mirror its
// exports by hand.
//
// This file is the *only* place this app describes the shared logic. It
// declares no behaviour — if a signature here disagrees with core/, the
// package is right and this file is wrong. CLAUDE.md in the shared repo names
// this file as the thing to update when a core/ signature changes.

declare module "citation-checker-script/core/models.js" {
  export interface ProviderConfig {
    /** Display name shown in the provider picker. */
    name: string;
    /** Model id passed to the provider API. */
    model: string;
    /** The provider cannot be called at all without a user-supplied key. */
    requiresKey: boolean;
    /**
     * A key is not required (the worker proxy injects one upstream), but
     * supplying one switches to a direct call.
     */
    optionalKey?: boolean;
    /** localStorage key the UI stores the user's key under, or null. */
    storageKey: string | null;
    /** Accent color for provider-tinted UI. */
    color: string;
  }

  export const PROVIDERS: Readonly<Record<string, ProviderConfig>>;
  export const PROVIDER_IDS: readonly string[];
  export const DEFAULT_PROVIDER: string;
  export function getProvider(id: string): ProviderConfig | null;
  export function modelFor(id: string): string | null;
  export function needsApiKey(id: string, apiKey?: string | null): boolean;
}

declare module "citation-checker-script/core/verdicts.js" {
  export const VERDICTS: {
    readonly SUPPORTED: "SUPPORTED";
    readonly PARTIALLY_SUPPORTED: "PARTIALLY SUPPORTED";
    readonly NOT_SUPPORTED: "NOT SUPPORTED";
    readonly SOURCE_UNAVAILABLE: "SOURCE UNAVAILABLE";
  };
  export type Verdict = (typeof VERDICTS)[keyof typeof VERDICTS];
  export const VERDICT_LIST: readonly Verdict[];
  export function canonicalizeVerdict(raw: unknown): Verdict | null;
  export function toTitleCase(canonical: string): string;
  export function toShortCode(canonical: string): string;
}

declare module "citation-checker-script/core/quote.js" {
  export type QuoteStatus =
    | "exact"
    | "normalized"
    | "partial"
    | "not-found"
    | "too-short"
    | "empty"
    | "no-source";

  export interface QuoteCheck {
    /** True only for `exact` and `normalized`. */
    verified: boolean;
    status: QuoteStatus;
    /**
     * The part of the quote actually located in the source. Renderers must
     * display THIS and never the model's raw quote — see the shared repo's
     * "Source quotes are verified before they are shown".
     */
    verifiedText: string;
  }

  export const QUOTE_STATUSES: Readonly<Record<string, QuoteStatus>>;
  export const QUOTE_STATUS_LIST: readonly QuoteStatus[];
  export function verifyQuote(sourceText: string, quote: string): QuoteCheck;
  export function quoteExpectedFor(verdict: string, reasonType?: string | null): boolean;
}

declare module "citation-checker-script/core/citations.js" {
  export interface Citation {
    /** The <sup class="reference"> anchor this citation was read from. */
    refElement: Element;
    /** Footnote id, e.g. "cite_note-smith-3". */
    refId: string;
    /** Sanitized <ref name="..."> when the citation came from a named ref. */
    refName: string | null;
    /** The bracketed number as rendered, without the brackets. */
    citationNumber: string;
    /** Article text between this citation and the previous one. */
    claimText: string;
    /** Resolved source URL, or null when the footnote has no fetchable link. */
    url: string | null;
    /** Page number parsed out of the footnote ("p. 42"), when present. */
    pageNum: number | null;
    /** Adjacent-citation group metadata (a solo citation has groupSize 1). */
    groupId?: string;
    groupSize?: number;
    groupIndex?: number;
    groupCitationNumbers?: string[];
  }

  export const MIN_CLAIM_LENGTH: number;
  export function collectCitations(
    root: Document | DocumentFragment | Element,
    options?: { minClaimLength?: number; claimScope?: "paragraph" | "sentence" },
  ): Citation[];
}

declare module "citation-checker-script/core/wikipedia.js" {
  export const DEFAULT_WIKI_HOST: string;
  export function deriveRestUrl(
    ref: { title: string; revisionId?: string | number | null },
    options?: { host?: string },
  ): string;
  export function fetchArticleHtml(
    ref: { title: string; revisionId?: string | number | null },
    options?: { host?: string; userAgent?: string; timeoutMs?: number },
  ): Promise<{ html: string | null; status: number | null; error: string | null }>;
}

declare module "citation-checker-script/core/pipeline.js" {
  import type { QuoteCheck } from "citation-checker-script/core/quote.js";
  import type { Verdict } from "citation-checker-script/core/verdicts.js";

  export const VERIFY_STAGES: {
    readonly SOURCE: "source";
    readonly PROVIDER: "provider";
    readonly PARSE: "parse";
  };
  export type VerifyStage = (typeof VERIFY_STAGES)[keyof typeof VERIFY_STAGES];

  export interface VerifySuccess {
    ok: true;
    /** The claim that was judged, echoed back from the request. */
    claimText: string;
    provider: string;
    model: string | null;
    verdict: Verdict;
    supportScore: number | null;
    comments: string;
    reasonType: string | null;
    /** The model's raw quote. Log it; display quote.verifiedText instead. */
    sourceQuote: string;
    quote: QuoteCheck;
    sourceUrl: string | null;
    sourceContent: string;
    sourceText: string;
    sourceStatus: number | null;
    usage: { input: number; output: number; cost_usd: number | null } | null;
    raw: string;
  }

  export interface VerifyFailure {
    ok: false;
    stage: VerifyStage;
    error: string;
    status?: number | null;
    cause?: unknown;
    raw?: string;
    sourceUrl: string | null;
    sourceContent?: string;
  }

  export function verifyCitation(options: {
    claimText: string;
    sourceUrl?: string | null;
    pageNum?: number | null;
    sourceContent?: string | null;
    provider: string;
    model?: string | null;
    apiKey?: string;
    workerBase?: string;
    systemPrompt?: string;
  }): Promise<VerifySuccess | VerifyFailure>;
}

declare module "citation-checker-script/core/worker.js" {
  export function fetchSourceContent(
    url: string,
    pageNum?: number | null,
    options?: { workerBase?: string; archiveFirst?: boolean },
  ): Promise<{ content: string | null; error: string | null; status: number | null }>;
  export function logVerification(payload: unknown, options?: { workerBase?: string }): void;
  export function postFeedback(payload: unknown, options?: { workerBase?: string }): Promise<true>;
}

declare module "citation-checker-script/core/feedback.js" {
  export function buildLogPayload(fields: Record<string, unknown>): Record<string, unknown>;
  export function newCheckId(source?: Crypto | null): string;
}
