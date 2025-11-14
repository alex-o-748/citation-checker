import { useState } from "react";
import CitationInputForm from "@/components/CitationInputForm";
import CitationResults, { type CitationResult } from "@/components/CitationResults";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [results, setResults] = useState<CitationResult[] | null>(null);
  const [refTagName, setRefTagName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: {
    wikipediaUrl: string;
    refTagName: string;
    sourceText: string;
  }) => {
    setIsLoading(true);
    setRefTagName(data.refTagName);
    setResults(null);

    try {
      const response = await apiRequest("POST", "/api/verify-citations", data);

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to verify citations");
      }

      setResults(responseData.results);

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      if (responseData.results.length === 0) {
        toast({
          title: "No citations found",
          description: `Could not find any citations with ref tag name "${data.refTagName}"`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">WikiCite Verify</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 md:px-8">
        <div className="mb-8 space-y-2">
          <h2 className="text-3xl font-semibold">Verify Wikipedia Citations</h2>
          <p className="text-lg text-muted-foreground">
            Check if claims in a Wikipedia article are supported by their sources
          </p>
        </div>

        <div className="space-y-8">
          <CitationInputForm onSubmit={handleSubmit} isLoading={isLoading} />

          {results !== null && (
            <div id="results" className="scroll-mt-8">
              <CitationResults
                results={results}
                sourceIdentifier={refTagName}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="mt-16 border-t py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground md:px-8">
          <p>Powered by AI-based text comparison</p>
        </div>
      </footer>
    </div>
  );
}
