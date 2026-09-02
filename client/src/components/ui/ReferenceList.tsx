import { useState } from "react";
import { loadArticleCitations, type Citation } from "@/lib/verification";

/**
 * One footnote in the article, with every claim that cites it.
 *
 * The article's citations come from the shared package's `collectCitations` —
 * the same collector the Wikipedia userscript and the Toolforge batch pipeline
 * use — so a footnote listed here is a footnote those tools would also find.
 * Grouping by `refId` is presentation only: a named `<ref>` cited five times
 * is one source backing five different claims, and verifying it once against
 * all five is what this app has always done.
 */
export interface ReferenceInfo {
  id: string;
  /** Display label: the ref name when there is one, else "[N]". */
  label: string;
  type: "named" | "unnamed";
  citations: Citation[];
  url: string | null;
  pageNum: number | null;
  preview: string;
}

export interface SelectedReference extends ReferenceInfo {
  articleTitle: string;
  revisionId: string | null;
}

interface ReferenceListProps {
  wikipediaUrl: string;
  onSelectReference: (reference: SelectedReference) => void;
  onBack?: () => void;
}

function groupByFootnote(citations: Citation[]): ReferenceInfo[] {
  const byRefId = new Map<string, ReferenceInfo>();
  for (const citation of citations) {
    let entry = byRefId.get(citation.refId);
    if (!entry) {
      entry = {
        id: citation.refId,
        label: citation.refName ?? `[${citation.citationNumber}]`,
        type: citation.refName ? "named" : "unnamed",
        citations: [],
        url: citation.url,
        pageNum: citation.pageNum,
        preview: citation.claimText,
      };
      byRefId.set(citation.refId, entry);
    }
    entry.citations.push(citation);
  }
  return Array.from(byRefId.values());
}

export default function ReferenceList({
  wikipediaUrl,
  onSelectReference,
  onBack,
}: ReferenceListProps) {
  const [references, setReferences] = useState<ReferenceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [articleTitle, setArticleTitle] = useState("");
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const itemsPerPage = 20;

  const loadReferences = async () => {
    setLoading(true);
    setError(null);

    try {
      const article = await loadArticleCitations(wikipediaUrl);
      setReferences(groupByFootnote(article.citations));
      setArticleTitle(article.title);
      setRevisionId(article.revisionId);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load references");
    } finally {
      setLoading(false);
    }
  };

  const filteredReferences = references.filter(
    (ref) =>
      ref.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref.url ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredReferences.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReferences = filteredReferences.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (references.length === 0 && !loading && !error) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Step 2: Load References</h2>
        <p className="mb-4 text-muted-foreground">
          Load the article's citations, then pick the one to verify.
        </p>
        <div className="flex gap-2">
          <button
            onClick={loadReferences}
            className="rounded-lg bg-primary px-6 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="button-load-references"
          >
            Load References
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-lg border px-6 py-2 transition-colors hover-elevate"
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-2 text-xl font-semibold">Select a Reference to Verify</h2>
      {articleTitle && (
        <p className="mb-4 text-muted-foreground">
          Article: <span className="font-medium">{articleTitle}</span>
          {revisionId && <span className="ml-2 text-sm">(revision {revisionId})</span>}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <span className="ml-3 text-muted-foreground">Loading references…</span>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button onClick={loadReferences} className="mt-2 underline">
            Try again
          </button>
        </div>
      )}

      {!loading && references.length > 0 && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search references…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
              data-testid="input-search-references"
            />
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredReferences.length)} of{" "}
            {filteredReferences.length} references
            {searchTerm && ` (filtered from ${references.length} total)`}
          </p>

          <div className="mb-4 space-y-2">
            {paginatedReferences.map((ref) => (
              <button
                key={ref.id}
                onClick={() => onSelectReference({ ...ref, articleTitle, revisionId })}
                className="group w-full rounded-lg border p-4 text-left transition-colors hover:border-primary hover-elevate"
                data-testid={`button-reference-${ref.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{ref.label}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {ref.type}
                      </span>
                      {ref.citations.length > 1 && (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {ref.citations.length} claims
                        </span>
                      )}
                      {ref.url ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                          🔗 Auto-fetch
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Paste source
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{ref.preview}</p>
                  </div>
                  <svg
                    className="ml-2 h-5 w-5 flex-shrink-0 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNum = idx + 1;
                  const showPage =
                    pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1;
                  const showEllipsisBefore = pageNum === currentPage - 2 && currentPage > 3;
                  const showEllipsisAfter = pageNum === currentPage + 2 && currentPage < totalPages - 2;

                  if (showEllipsisBefore || showEllipsisAfter) {
                    return (
                      <span key={pageNum} className="px-2 text-muted-foreground">
                        …
                      </span>
                    );
                  }
                  if (!showPage) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`rounded-lg px-3 py-1 text-sm font-medium ${
                        currentPage === pageNum ? "bg-primary text-primary-foreground" : "hover-elevate"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-4 text-sm">
            <button onClick={loadReferences} className="underline">
              Reload references
            </button>
            {onBack && (
              <button onClick={onBack} className="underline">
                Change article
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
