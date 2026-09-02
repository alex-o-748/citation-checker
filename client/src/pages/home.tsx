import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReferenceList, { type SelectedReference } from "@/components/ui/ReferenceList";
import CitationResults, { type CitationResult } from "@/components/CitationResults";
import { FileText, Loader2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  PROVIDERS,
  PROVIDER_IDS,
  DEFAULT_PROVIDER,
  modelFor,
  fetchSourceContent,
  verifyCitation,
  logCheck,
  VERDICTS,
  VERIFY_STAGES,
} from "@/lib/verification";

// Where to send a user who needs a key. Purely a link — which providers exist,
// what they are called and which model each calls all come from the shared
// package's PROVIDERS table.
const KEY_LINKS: Record<string, { href: string; label: string; placeholder: string }> = {
  claude: { href: "https://console.anthropic.com/settings/keys", label: "console.anthropic.com", placeholder: "sk-ant-…" },
  openai: { href: "https://platform.openai.com/api-keys", label: "platform.openai.com", placeholder: "sk-…" },
  gemini: { href: "https://aistudio.google.com/apikey", label: "aistudio.google.com", placeholder: "AI…" },
  huggingface: { href: "https://huggingface.co/settings/tokens", label: "huggingface.co", placeholder: "hf_… (optional)" },
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState<"apikey" | "url" | "reference" | "source">("url");

  const [provider, setProvider] = useState<string>(DEFAULT_PROVIDER);
  const [apiKey, setApiKey] = useState("");
  const [wikipediaUrl, setWikipediaUrl] = useState("");
  const [selectedReference, setSelectedReference] = useState<SelectedReference | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [autoFetchedUrl, setAutoFetchedUrl] = useState<string | null>(null);

  const [results, setResults] = useState<CitationResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const providerConfig = PROVIDERS[provider];
  const keyLink = KEY_LINKS[provider];
  const selectedRefHasUrl = Boolean(selectedReference?.url);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerConfig.requiresKey || apiKey) setCurrentStep("url");
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    setApiKey("");
    if (!PROVIDERS[value].requiresKey && currentStep === "apikey") setCurrentStep("url");
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wikipediaUrl) return;
    setCurrentStep("reference");
    setSelectedReference(null);
    setSourceText("");
    setResults(null);
  };

  const handleReferenceSelect = (reference: SelectedReference) => {
    setSelectedReference(reference);
    setCurrentStep("source");
    setAutoFetchedUrl(null);
    setSourceText("");
    setResults(null);
  };

  const handleBackToUrl = () => {
    setCurrentStep("url");
    setSelectedReference(null);
    setSourceText("");
    setResults(null);
  };

  const handleBackToReference = () => {
    setCurrentStep("reference");
    setSelectedReference(null);
    setSourceText("");
    setAutoFetchedUrl(null);
    setResults(null);
  };

  /**
   * Runs the check. Every judgement here is the shared package's:
   * `fetchSourceContent` retrieves the source through the same CORS proxy the
   * Wikipedia userscript uses, and `verifyCitation` builds the prompt, calls
   * the model, parses the verdict and checks the quote. This function only
   * decides what to show.
   *
   * The source is fetched once and reused for every claim citing it — a named
   * <ref> backing five claims is one fetch and five model calls, not five of
   * each.
   */
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReference) return;

    setIsLoading(true);
    setResults(null);

    try {
      let sourceContent: string | null = sourceText.trim() ? `Manual source text:\n${sourceText}` : null;

      if (!sourceContent && selectedReference.url) {
        const fetched = await fetchSourceContent(selectedReference.url, selectedReference.pageNum);
        if (!fetched.content) {
          const detail = fetched.status != null ? ` (HTTP ${fetched.status})` : "";
          throw new Error(
            `Could not retrieve the source${detail}: ${fetched.error ?? "no content"}. Paste the source text instead.`,
          );
        }
        sourceContent = fetched.content;
        setAutoFetchedUrl(selectedReference.url);
      }

      if (!sourceContent) {
        throw new Error("This citation has no fetchable URL — paste the source text to verify it.");
      }

      const verified: CitationResult[] = [];
      for (let index = 0; index < selectedReference.citations.length; index++) {
        const citation = selectedReference.citations[index];
        const result = await verifyCitation({
          claimText: citation.claimText,
          sourceUrl: selectedReference.url,
          pageNum: citation.pageNum,
          sourceContent,
          provider,
          model: modelFor(provider),
          apiKey: apiKey.trim() || undefined,
        });

        if (!result.ok) {
          // Reported on the claim it belongs to rather than aborting the run:
          // one failed call shouldn't discard the claims that did get a
          // verdict. A source that could not be retrieved really is
          // SOURCE UNAVAILABLE; a failed model call or unreadable output is
          // not a verdict at all, so it is carried as an error instead and
          // kept out of the verdict counts.
          const sourceMissing = result.stage === VERIFY_STAGES.SOURCE;
          verified.push({
            id: index + 1,
            citationNumber: citation.citationNumber,
            wikipediaClaim: citation.claimText,
            verdict: VERDICTS.SOURCE_UNAVAILABLE,
            supportScore: null,
            reasoning: sourceMissing ? result.error : "",
            sourceExcerpt: "",
            quoteStatus: "no-source",
            error: sourceMissing
              ? undefined
              : result.stage === VERIFY_STAGES.PROVIDER
                ? `The model call failed: ${result.error}`
                : `The model's answer could not be read: ${result.error}`,
          });
          continue;
        }

        logCheck(result, {
          articleUrl: wikipediaUrl,
          articleTitle: selectedReference.articleTitle,
          revisionId: selectedReference.revisionId,
          citationNumber: citation.citationNumber,
        });

        verified.push({
          id: index + 1,
          citationNumber: citation.citationNumber,
          wikipediaClaim: citation.claimText,
          verdict: result.verdict,
          supportScore: result.supportScore,
          reasoning: result.comments,
          // verifiedText, never the model's raw quote — only text actually
          // located in the source reaches the screen.
          sourceExcerpt: result.quote.verifiedText,
          quoteStatus: result.quote.status,
        });
      }

      setResults(verified);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);
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
          {currentStep === "apikey" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Choose AI Provider
                </CardTitle>
                <CardDescription>
                  Pick a model. {PROVIDERS[DEFAULT_PROVIDER].name} is free and needs no API key.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleApiKeySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider-select">AI Provider</Label>
                    <Select value={provider} onValueChange={handleProviderChange}>
                      <SelectTrigger id="provider-select" data-testid="select-provider">
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_IDS.map((id) => (
                          <SelectItem key={id} value={id} data-testid={`option-${id}`}>
                            {PROVIDERS[id].name}
                            {PROVIDERS[id].requiresKey ? "" : " (free — no API key needed)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Model: <span className="font-mono">{providerConfig.model}</span>
                    </p>
                  </div>

                  {(providerConfig.requiresKey || providerConfig.optionalKey) && (
                    <div className="space-y-2">
                      <Label htmlFor="api-key">
                        {providerConfig.name} API Key
                        {providerConfig.optionalKey && " (optional)"}
                      </Label>
                      <Input
                        id="api-key"
                        data-testid="input-api-key"
                        type="password"
                        placeholder={keyLink?.placeholder ?? ""}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        required={providerConfig.requiresKey}
                      />
                      <p className="text-sm text-muted-foreground">
                        Your API key stays in this browser tab — it is never stored and never sent
                        anywhere but the provider.
                        {keyLink && (
                          <>
                            {" "}
                            Get a key from{" "}
                            <a
                              href={keyLink.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2"
                            >
                              {keyLink.label}
                            </a>
                            .
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    data-testid="button-continue-with-key"
                    disabled={providerConfig.requiresKey && !apiKey}
                  >
                    Continue
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {currentStep === "url" && (
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
                      Example: https://en.wikipedia.org/wiki/Great_Wall_of_China — add
                      <span className="font-mono"> ?oldid=…</span> to pin a revision.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={!wikipediaUrl}>
                      Continue to Select Reference
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCurrentStep("apikey")}>
                      Change Provider/Key
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Using {providerConfig.name} (<span className="font-mono">{providerConfig.model}</span>)
                  </p>
                </form>
              </CardContent>
            </Card>
          )}

          {currentStep === "reference" && (
            <ReferenceList
              wikipediaUrl={wikipediaUrl}
              onSelectReference={handleReferenceSelect}
              onBack={handleBackToUrl}
            />
          )}

          {currentStep === "source" && selectedReference && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedRefHasUrl ? "Step 3: Verify Citation" : "Step 3: Enter Source Text"}
                </CardTitle>
                <CardDescription>
                  {selectedRefHasUrl
                    ? "The source will be fetched from the citation's URL"
                    : "This citation links to no fetchable source — paste its text to verify against"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifySubmit} className="space-y-6">
                  <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm font-medium">Selected Reference</p>
                    <p className="break-all font-mono text-sm">{selectedReference.label}</p>
                    {selectedReference.url && (
                      <p className="break-all text-sm text-muted-foreground">
                        {selectedReference.url}
                        {selectedReference.pageNum ? ` (p. ${selectedReference.pageNum})` : ""}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {selectedReference.citations.length} claim
                      {selectedReference.citations.length !== 1 ? "s" : ""} cite
                      {selectedReference.citations.length === 1 ? "s" : ""} this reference.
                    </p>
                    <Button type="button" onClick={handleBackToReference} variant="outline" size="sm">
                      Select Different Reference
                    </Button>
                  </div>

                  {autoFetchedUrl && (
                    <div className="space-y-1 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        ✓ Source Auto-Fetched
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Content was fetched from {new URL(autoFetchedUrl).hostname}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="source-text">
                      Source Text {selectedRefHasUrl && "(optional — overrides the fetched source)"}
                    </Label>
                    <Textarea
                      id="source-text"
                      data-testid="input-source-text"
                      placeholder="Paste the full text of your source material here…"
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      required={!selectedRefHasUrl}
                      disabled={isLoading}
                      className="min-h-64 font-serif"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing Citations…
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

          {results !== null && selectedReference && (
            <div id="results" className="scroll-mt-8">
              <CitationResults results={results} sourceIdentifier={selectedReference.label} />
              <div className="mt-4">
                <Button onClick={handleBackToReference} variant="outline">
                  Verify Another Reference
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-16 border-t py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground md:px-8">
          <p>
            Prompts, models and source fetching are shared with the{" "}
            <a
              href="https://en.wikipedia.org/wiki/User:Alaexis/AI_Source_Verification"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              AI Source Verification
            </a>{" "}
            Wikipedia user script, so both give the same verdict.
          </p>
          <p className="mt-2">
            Verdicts are logged anonymously to help measure accuracy — no username, no API key.
          </p>
          <p className="mt-2">
            Questions or feedback?{" "}
            <a
              href="mailto:wikicitechecker@gmail.com"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              wikicitechecker@gmail.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
