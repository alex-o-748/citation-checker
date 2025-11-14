import { useState } from "react";
import CitationInputForm from "@/components/CitationInputForm";
import CitationResults, { type CitationResult } from "@/components/CitationResults";
import { FileText } from "lucide-react";

export default function Home() {
  const [results, setResults] = useState<CitationResult[] | null>(null);
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: {
    wikipediaUrl: string;
    sourceIdentifier: string;
    sourceText: string;
  }) => {
    setIsLoading(true);
    setSourceIdentifier(data.sourceIdentifier);

    console.log("Verifying citations with data:", data);

    // Simulate API call
    setTimeout(() => {
      // Mock results for demonstration
      const mockResults: CitationResult[] = [
        {
          id: 1,
          wikipediaClaim: "The Great Wall of China is approximately 21,196 kilometers long.",
          sourceExcerpt: "Recent archaeological surveys have determined that the total length of the Great Wall measures 21,196.18 km.",
          confidence: 95,
        },
        {
          id: 2,
          wikipediaClaim: "Construction began in the 7th century BC.",
          sourceExcerpt: "Early wall segments were built during the Warring States period, with major construction in the 3rd century BC.",
          confidence: 65,
        },
      ];

      setResults(mockResults);
      setIsLoading(false);

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 2000);
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
                sourceIdentifier={sourceIdentifier}
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
