import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ReferenceList from "@/components/ui/ReferenceList";
import CitationResults, { type CitationResult } from "@/components/CitationResults";
import { FileText, Loader2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  // Step tracking
  const [currentStep, setCurrentStep] = useState<'apikey' | 'url' | 'reference' | 'source'>('apikey');

  // Form state
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [wikipediaUrl, setWikipediaUrl] = useState("");
  const [selectedReference, setSelectedReference] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [autoFetchedUrl, setAutoFetchedUrl] = useState<string | null>(null);
  const [selectedRefHasUrl, setSelectedRefHasUrl] = useState(false);
  
  // Results state
  const [results, setResults] = useState<CitationResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (claudeApiKey) {
      setCurrentStep('url');
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wikipediaUrl) {
      setCurrentStep('reference');
      setSelectedReference('');
      setSourceText('');
      setResults(null);
    }
  };

  const handleBackToApiKey = () => {
    setCurrentStep('apikey');
  };

  const handleReferenceSelect = (refId: string, hasUrl?: boolean) => {
    setSelectedReference(refId);
    setSelectedRefHasUrl(hasUrl || false);  // ADD THIS
    setCurrentStep('source');
    setAutoFetchedUrl(null); 
    setResults(null);
  };

  const handleBackToUrl = () => {
    setCurrentStep('url');
    setSelectedReference('');
    setSourceText('');
    setResults(null);
  };

  const handleBackToReference = () => {
    setCurrentStep('reference');
    setSelectedReference('');
    setSourceText('');
    setAutoFetchedUrl(null);
    setResults(null);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResults(null);

    try {
      // Prepare request body - only include sourceText if it has content
      const requestBody: any = {
        wikipediaUrl,
        refTagName: selectedReference,
      };

      if (sourceText && sourceText.trim().length > 0) {
        requestBody.sourceText = sourceText;
      }

      const response = await apiRequest("POST", "/api/verify-citations", {
        wikipediaUrl,
        refTagName: selectedReference,
        sourceText,
        claudeApiKey,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to verify citations");
      }

      setResults(responseData.results);

      if (responseData.sourceFetchedAutomatically && responseData.sourceUrl) {
        setAutoFetchedUrl(responseData.sourceUrl);
        toast({
          title: "Source auto-fetched",
          description: `Successfully fetched content from ${new URL(responseData.sourceUrl).hostname}`,
        });
      } else {
        setAutoFetchedUrl(null);
      }

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      if (responseData.results.length === 0) {
        toast({
          title: "No citations found",
          description: `Could not find any citations with reference "${selectedReference}"`,
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

        <div className="space-y-6">
          {/* Step 0: API Key */}
          {currentStep === 'apikey' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Enter Your Claude API Key
                </CardTitle>
                <CardDescription>
                  This tool uses Claude AI to verify citations. Enter your Anthropic API key to get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleApiKeySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="claude-api-key">Claude API Key</Label>
                    <Input
                      id="claude-api-key"
                      data-testid="input-claude-api-key"
                      type="password"
                      placeholder="sk-ant-..."
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Your API key is only used for this session and is never stored. 
                      Get your key from{" "}
                      <a 
                        href="https://console.anthropic.com/settings/keys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        console.anthropic.com
                      </a>
                    </p>
                  </div>
                  <Button type="submit" data-testid="button-continue-with-key" disabled={!claudeApiKey}>
                    Continue
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Wikipedia URL */}
          {currentStep === 'url' && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Enter Wikipedia Article</CardTitle>
                <CardDescription>
                  Paste the URL of the Wikipedia article you want to verify
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUrlSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wikipedia-url">Wikipedia Article URL</Label>
                    <Input
                      id="wikipedia-url"
                      data-testid="input-wikipedia-url"
                      type="url"
                      placeholder="https://en.wikipedia.org/wiki/Article_Name"
                      value={wikipediaUrl}
                      onChange={(e) => setWikipediaUrl(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Example: https://en.wikipedia.org/wiki/Great_Wall_of_China
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={!wikipediaUrl}>
                      Continue to Select Reference
                    </Button>
                    <Button type="button" variant="outline" onClick={handleBackToApiKey}>
                      Change API Key
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Reference Selection */}
          {currentStep === 'reference' && (
            <ReferenceList
              wikipediaUrl={wikipediaUrl}
              onSelectReference={handleReferenceSelect}
              onBack={handleBackToUrl}
            />
          )}

          {/* Step 3: Source Text Input */}
          {currentStep === 'source' && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Enter Source Text</CardTitle>
                <CardDescription>
                  {selectedRefHasUrl 
                    ? "This reference has a URL - leave the text field empty to auto-fetch, or paste text manually if needed"
                    : "Paste the text from your source document to verify against"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifySubmit} className="space-y-6">
                  {/* Show selected reference */}
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <p className="text-sm font-medium">Selected Reference</p>
                    <p className="font-mono text-sm break-all">{selectedReference}</p>
                    <Button
                      type="button"
                      onClick={handleBackToReference}
                      variant="outline"
                      size="sm"
                    >
                      Select Different Reference
                    </Button>
                  </div>

                  {autoFetchedUrl && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-1">
                      <p className="text-sm font-medium text-green-900">✓ Source Auto-Fetched</p>
                      <p className="text-sm text-green-700">
                        Content was automatically fetched from: {new URL(autoFetchedUrl).hostname}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="source-text">Source Text</Label>
                    <Textarea
                      id="source-text"
                      placeholder="Paste the full text of your source material here, or leave empty to auto-fetch from URL..."
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      required={false}
                      disabled={isLoading}
                      className="min-h-64 font-serif"
                    />
                    <p className="text-sm text-muted-foreground">
                      Paste the text from your source document, or leave empty to automatically fetch from the citation URL (if available)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing Citations...
                        </>
                      ) : (
                        "Verify Citations"
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleBackToReference}
                      variant="outline"
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results !== null && (
            <div id="results" className="scroll-mt-8">
              <CitationResults
                results={results}
                sourceIdentifier={selectedReference}
              />
              <div className="mt-4">
                <Button
                  onClick={handleBackToReference}
                  variant="outline"
                >
                  Verify Another Reference
                </Button>
              </div>
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