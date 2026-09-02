import CitationCard from "./CitationCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { VERDICTS, type Verdict, type QuoteStatus } from "@/lib/verification";

export interface CitationResult {
  id: number;
  /** The bracketed number as rendered in the article, e.g. "14". */
  citationNumber: string;
  wikipediaClaim: string;
  verdict: Verdict;
  supportScore: number | null;
  reasoning: string;
  /** Only ever text located in the source; "" when nothing was located. */
  sourceExcerpt: string;
  quoteStatus: QuoteStatus;
  /**
   * Set when the check could not be completed at all — the model call failed,
   * or its answer was unreadable. Distinct from a verdict: a rate-limited
   * request tells you nothing about the citation, so these are counted
   * separately rather than folded into "Source Unavailable".
   */
  error?: string;
}

interface CitationResultsProps {
  results: CitationResult[];
  sourceIdentifier: string;
}

const SUMMARY = [
  { verdict: VERDICTS.SUPPORTED, title: "Supported", icon: CheckCircle2, border: "border-green-200 dark:border-green-900", color: "text-green-600 dark:text-green-400", testId: "text-supported-count" },
  { verdict: VERDICTS.PARTIALLY_SUPPORTED, title: "Partial", icon: AlertTriangle, border: "border-amber-200 dark:border-amber-900", color: "text-amber-600 dark:text-amber-400", testId: "text-partial-count" },
  { verdict: VERDICTS.NOT_SUPPORTED, title: "Not Supported", icon: XCircle, border: "border-red-200 dark:border-red-900", color: "text-red-600 dark:text-red-400", testId: "text-unsupported-count" },
  { verdict: VERDICTS.SOURCE_UNAVAILABLE, title: "Source Unavailable", icon: HelpCircle, border: "", color: "text-muted-foreground", testId: "text-unavailable-count" },
] as const;

export default function CitationResults({ results, sourceIdentifier }: CitationResultsProps) {
  const judged = results.filter((r) => !r.error);
  const failed = results.length - judged.length;

  if (results.length === 0) {
    return (
      <Alert data-testid="alert-no-results">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Citations Found</AlertTitle>
        <AlertDescription>
          Could not find any claims citing "{sourceIdentifier}" in the article.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Verification Results for "{sourceIdentifier}"
        </h2>
        <div className="grid gap-3 md:grid-cols-4">
          {SUMMARY.map(({ verdict, title, icon: Icon, border, color, testId }) => {
            const count = judged.filter((r) => r.verdict === verdict).length;
            return (
              <Alert key={verdict} className={border}>
                <Icon className={`h-4 w-4 ${color}`} />
                <AlertTitle>{title}</AlertTitle>
                <AlertDescription data-testid={testId}>
                  {count} citation{count !== 1 ? "s" : ""}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
        {failed > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="text-failed-count">
            {failed} check{failed !== 1 ? "s" : ""} could not be completed — see below.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <CitationCard
            key={result.id}
            citationNumber={result.citationNumber}
            wikipediaClaim={result.wikipediaClaim}
            sourceExcerpt={result.sourceExcerpt}
            verdict={result.verdict}
            supportScore={result.supportScore}
            reasoning={result.reasoning}
            error={result.error}
          />
        ))}
      </div>
    </div>
  );
}
