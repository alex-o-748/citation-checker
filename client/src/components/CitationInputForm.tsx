import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface CitationInputFormProps {
  onSubmit: (data: {
    wikipediaUrl: string;
    refTagName: string;
    sourceText: string;
  }) => void;
  isLoading?: boolean;
}

export default function CitationInputForm({
  onSubmit,
  isLoading = false,
}: CitationInputFormProps) {
  const [wikipediaUrl, setWikipediaUrl] = useState("");
  const [refTagName, setRefTagName] = useState("");
  const [sourceText, setSourceText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ wikipediaUrl, refTagName, sourceText });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Citation Verification</CardTitle>
        <CardDescription>
          Enter a Wikipedia article and the source material you want to verify
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Paste the full URL of the Wikipedia article
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-tag-name">Reference Tag Name</Label>
            <Input
              id="ref-tag-name"
              data-testid="input-ref-tag-name"
              placeholder='e.g., smith2020 (from <ref name="smith2020">)'
              value={refTagName}
              onChange={(e) => setRefTagName(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Enter the ref tag name from the Wikipedia source code (view page source and look for &lt;ref name="..."&gt;)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-text">Source Text</Label>
            <Textarea
              id="source-text"
              data-testid="input-source-text"
              placeholder="Paste the full text of your source material here..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              required
              disabled={isLoading}
              className="min-h-64 font-serif"
            />
            <p className="text-sm text-muted-foreground">
              Copy and paste the text from your source document
            </p>
          </div>

          <Button
            type="submit"
            data-testid="button-verify"
            className="w-full md:w-auto"
            disabled={isLoading}
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
        </form>
      </CardContent>
    </Card>
  );
}
