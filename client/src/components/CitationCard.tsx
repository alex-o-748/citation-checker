import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, AlertCircle } from "lucide-react";
import { VERDICTS, type Verdict } from "@/lib/verification";

interface CitationCardProps {
  citationNumber: string;
  wikipediaClaim: string;
  /**
   * Text located verbatim in the source. Never the model's raw quote — the
   * shared package hands back only the part it could actually find, and an
   * unlocated quote arrives here as "" and renders nothing.
   */
  sourceExcerpt: string;
  verdict: Verdict;
  supportScore: number | null;
  reasoning: string;
  /** Set when the check failed outright; shown instead of a verdict badge. */
  error?: string;
}

const VERDICT_STYLES = {
  [VERDICTS.SUPPORTED]: {
    label: "Supported",
    icon: CheckCircle2,
    variant: "default" as const,
    color: "text-green-600 dark:text-green-400",
  },
  [VERDICTS.PARTIALLY_SUPPORTED]: {
    label: "Partially Supported",
    icon: AlertTriangle,
    variant: "secondary" as const,
    color: "text-amber-600 dark:text-amber-400",
  },
  [VERDICTS.NOT_SUPPORTED]: {
    label: "Not Supported",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-600 dark:text-red-400",
  },
  [VERDICTS.SOURCE_UNAVAILABLE]: {
    label: "Source Unavailable",
    icon: HelpCircle,
    variant: "outline" as const,
    color: "text-muted-foreground",
  },
} as const;

export default function CitationCard({
  citationNumber,
  wikipediaClaim,
  sourceExcerpt,
  verdict,
  supportScore,
  reasoning,
  error,
}: CitationCardProps) {
  const status = VERDICT_STYLES[verdict] ?? VERDICT_STYLES[VERDICTS.SOURCE_UNAVAILABLE];
  const StatusIcon = status.icon;

  return (
    <Card data-testid={`card-citation-${citationNumber}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" data-testid={`badge-citation-${citationNumber}`}>
            Citation [{citationNumber}]
          </Badge>
          {error ? (
            <Badge variant="outline" data-testid={`badge-status-${citationNumber}`}>
              <AlertCircle className="mr-1 h-3 w-3" />
              Check failed
            </Badge>
          ) : (
            <Badge variant={status.variant} data-testid={`badge-status-${citationNumber}`}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.label}
            </Badge>
          )}
        </div>
        {!error && supportScore !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Support score:</span>
            <span
              className={`text-2xl font-bold ${status.color}`}
              data-testid={`text-support-score-${citationNumber}`}
            >
              {supportScore}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-muted-foreground" data-testid={`text-error-${citationNumber}`}>
            {error}
          </p>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Wikipedia Claim</h3>
            <blockquote
              className="border-l-4 border-primary pl-4 font-serif text-lg italic"
              data-testid={`text-claim-${citationNumber}`}
            >
              {wikipediaClaim}
            </blockquote>
          </div>
          <div className={`space-y-2 ${error ? "hidden md:block" : ""}`}>
            <h3 className="text-sm font-medium text-muted-foreground">Source Excerpt</h3>
            {/*
              Shown only when the quote was located in the fetched source. When
              it was not, this block says nothing rather than warning: a model
              that paraphrases instead of copying may still be judging
              correctly, so a warning here would cast doubt nobody has
              measured. Same rule the Wikipedia userscript follows.
            */}
            {sourceExcerpt ? (
              <div
                className="rounded-md bg-muted/50 p-4 font-serif text-lg"
                data-testid={`text-excerpt-${citationNumber}`}
              >
                {sourceExcerpt}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No verbatim passage to show for this verdict.
              </p>
            )}
          </div>
        </div>

        {reasoning && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Reasoning</h3>
            <p className="text-sm" data-testid={`text-reasoning-${citationNumber}`}>
              {reasoning}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
