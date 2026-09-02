# Citation Checker

A web front end for verifying Wikipedia citations: paste an article URL, pick a
reference, and get a verdict on whether the source actually supports the claims
citing it.

**It is a UI and nothing else.** Every judgement it makes — the prompt, the
few-shot examples, which model each provider calls, how the source is fetched,
how the verdict is parsed, how a quote is checked against the source — comes
from [`citation-checker-script`](https://github.com/alex-o-748/citation-checker-script),
the repository behind the [AI Source Verification](https://en.wikipedia.org/wiki/User:Alaexis/AI_Source_Verification)
Wikipedia user script. This app cannot disagree with that user script about a
verdict, because it is running the same code.

That was not true before. This app used to carry its own copy of everything:
its own prompt with its own JSON schema, its own provider table pinned to
`gemini-1.5-flash` and to `claude-sonnet-4-5-20250514` (a model id that does not
exist), its own wikitext parser, its own source fetcher and its own database. All
of it has been deleted.

## How it works

```
client/src/lib/verification.ts   ← the only file that touches the shared package
        │
        ├── core/wikipedia.js    fetch the article's rendered HTML
        ├── core/citations.js    find every citation, its claim text and its source URL
        ├── core/worker.js       fetch the source through the CORS proxy; log the check
        └── core/pipeline.js     verifyCitation(): prompt → model → verdict → quote check
```

Everything runs in the browser. There is no backend: no Pages Functions, no
Express server, no database, no server-side API key. The app is a static site.

Keyless providers (HuggingFace, PublicAI, Lift Wing) and all source fetching go
through the shared Cloudflare Worker proxy
(`publicai-proxy.alaexis.workers.dev`, in `alex-o-748/public-ai-proxy`), which
is what makes them work cross-origin and what holds the upstream credentials. A
user-supplied key (Claude, Gemini, OpenAI) goes straight from their browser to
that provider, is kept for the tab only, and is never stored.

Completed checks are logged anonymously through the same Worker endpoint the
user script uses, so checks from both tools land in one table rather than two.
No username, no key.

## Development

```bash
npm install     # pulls citation-checker-script from GitHub
npm run dev     # Vite dev server on :5000
npm run check   # tsc
npm run build   # → dist/public
```

Deployment: see `CLOUDFLARE_DEPLOYMENT.md`.

## The shared dependency

```json
"citation-checker-script": "github:alex-o-748/citation-checker-script#<ref>"
```

Not an npm-registry package — it is installed from GitHub. To pick up an
upstream change, bump the ref (or `npm update citation-checker-script` if it
tracks a branch) and rebuild.

> **Pinned to a branch right now.** `package.json` points at
> `#claude/citation-verification-ui-refactor-legdi6`, the branch that adds
> `core/models.js` and `core/pipeline.js` upstream. Once that branch merges,
> change the ref to `#main` (or better, a tag) — a long-lived feature-branch
> pin will go stale silently.

That package ships no TypeScript types. `client/src/types/citation-checker-script.d.ts`
declares them by hand, and is the one file to update when an upstream signature
changes.

## Where to put a change

| Changing… | Goes in |
| --- | --- |
| The prompt, a few-shot example, the verdict rubric | `citation-checker-script/core/prompts.js` |
| Which model a provider calls, or adding a provider | `citation-checker-script/core/models.js` |
| How a source is fetched, or the verdict/quote logic | `citation-checker-script/core/` |
| Layout, wording, steps, styling of this app | here |

If you find yourself writing a prompt or a model id in this repository, that is
the signal something belongs upstream instead.
