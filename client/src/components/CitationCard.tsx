import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface CitationCardProps {
  wikipediaClaim: string;
  sourceExcerpt: string;
  confidence: number;
  supportStatus: 'supported' | 'partially_supported' | 'not_supported';
  citationNumber: number;
}

export default function CitationCard({
  wikipediaClaim,
  sourceExcerpt,
  confidence,
  supportStatus,
  citationNumber,
}: CitationCardProps) {
  const getStatusInfo = () => {
    if (supportStatus === 'supported') {
      return {
        label: "Supported",
        icon: CheckCircle2,
        variant: "default" as const,
        color: "text-green-600 dark:text-green-400",
      };
    } else if (supportStatus === 'partially_supported') {
      return {
        label: "Partially Supported",
        icon: AlertTriangle,
        variant: "secondary" as const,
        color: "text-amber-600 dark:text-amber-400",
      };
    } else {
      return {
        label: "Not Supported",
        icon: XCircle,
        variant: "destructive" as const,
        color: "text-red-600 dark:text-red-400",
      };
    }
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <Card data-testid={`card-citation-${citationNumber}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" data-testid={`badge-citation-${citationNumber}`}>
            Citation #{citationNumber}
          </Badge>
          <Badge variant={status.variant} data-testid={`badge-status-${citationNumber}`}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Confidence:</span>
          <span
            className={`text-2xl font-bold ${status.color}`}
            data-testid={`text-confidence-${citationNumber}`}
          >
            {confidence}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Wikipedia Claim
            </h3>
            <blockquote
              className="border-l-4 border-primary pl-4 font-serif text-lg italic"
              data-testid={`text-claim-${citationNumber}`}
            >
              {wikipediaClaim}
            </blockquote>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Source Excerpt
            </h3>
            <div
              className="rounded-md bg-muted/50 p-4 font-serif text-lg"
              data-testid={`text-excerpt-${citationNumber}`}
            >
              {sourceExcerpt}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
