import CitationCard from "./CitationCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export interface CitationResult {
  id: number;
  wikipediaClaim: string;
  sourceExcerpt: string;
  confidence: number;
}

interface CitationResultsProps {
  results: CitationResult[];
  sourceIdentifier: string;
}

export default function CitationResults({
  results,
  sourceIdentifier,
}: CitationResultsProps) {
  if (results.length === 0) {
    return (
      <Alert data-testid="alert-no-results">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Citations Found</AlertTitle>
        <AlertDescription>
          Could not find any citations matching "{sourceIdentifier}" in the article.
          Please check the source identifier and try again.
        </AlertDescription>
      </Alert>
    );
  }

  const supportedCount = results.filter((r) => r.confidence >= 80).length;
  const partialCount = results.filter((r) => r.confidence >= 50 && r.confidence < 80).length;
  const unsupportedCount = results.filter((r) => r.confidence < 50).length;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Verification Results for "{sourceIdentifier}"
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Alert className="border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle>Supported</AlertTitle>
            <AlertDescription data-testid="text-supported-count">
              {supportedCount} citation{supportedCount !== 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
          <Alert className="border-amber-200 dark:border-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Partial</AlertTitle>
            <AlertDescription data-testid="text-partial-count">
              {partialCount} citation{partialCount !== 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
          <Alert className="border-red-200 dark:border-red-900">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle>Not Supported</AlertTitle>
            <AlertDescription data-testid="text-unsupported-count">
              {unsupportedCount} citation{unsupportedCount !== 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <CitationCard
            key={result.id}
            citationNumber={result.id}
            wikipediaClaim={result.wikipediaClaim}
            sourceExcerpt={result.sourceExcerpt}
            confidence={result.confidence}
          />
        ))}
      </div>
    </div>
  );
}
