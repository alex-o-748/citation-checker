# Wikipedia Citation Verification Tool

## Overview

This is a Wikipedia citation verification tool that uses AI to validate whether citations in Wikipedia articles are accurately supported by their source materials. Users input a Wikipedia URL, specify a citation reference tag, and provide the source text. The system then extracts all instances where that citation is used, and uses AI to verify each claim against the provided source material, returning confidence scores and detailed analysis.

**Key Features:**
- **Multi-provider AI support**: Choose between Claude (Anthropic), OpenAI (GPT-4o), or Google Gemini for verification
- **Bring Your Own Key (BYOK)**: Users provide their own API keys - keys are never stored, only used for the session
- **Auto-fetch sources**: Automatically retrieves source content from URLs embedded in citations
- **Confidence scoring**: AI provides 0-100 confidence scores with detailed reasoning

The application is designed as a utility-first tool with a focus on clarity and reading comfort, inspired by Linear and Notion's clean interfaces with Material Design patterns for data display.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**Routing**: Wouter for lightweight client-side routing (single-page application with home page and 404 fallback).

**UI Component Library**: Shadcn/ui with Radix UI primitives, providing an extensive set of pre-built, accessible components following the "new-york" style variant. Components are customized using Tailwind CSS with CSS variables for theming.

**State Management**: 
- TanStack Query (React Query) for server state management and API data fetching
- Local React state for form inputs and UI state
- No global state management library needed due to simple, stateless architecture

**Styling System**:
- Tailwind CSS with custom design tokens defined in CSS variables
- Typography uses Inter/SF Pro Display for UI, Georgia/serif for reading text
- Spacing follows Tailwind primitives (units of 3, 4, 6, 8)
- Custom color system with support for light/dark modes
- Container max-widths: 5xl for main content, 7xl for comparison views

**Design Philosophy**:
- Information clarity prioritized over decoration
- Scannable results with color-coded confidence indicators
- Side-by-side comparison layout on desktop, stacked on mobile
- Reading comfort optimized for extended text comparison sessions

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript.

**API Design**: RESTful API with a single primary endpoint (`POST /api/verify-citations`) that handles the entire verification workflow.

**Request Flow**:
1. Receive and validate input (Wikipedia URL, citation reference tag, source text)
2. Fetch Wikipedia article wikitext via Wikipedia API
3. Parse wikitext to extract citation instances using regex-based parser
4. Send each claim to Claude AI for verification
5. Aggregate results and return structured response

**Validation**: Zod schemas for request/response validation, ensuring type safety between client and server.

**Error Handling**: Centralized error handling with meaningful error messages returned to client. Service unavailability detected when ANTHROPIC_API_KEY is missing.

**Logging**: Custom request/response logging middleware that captures API calls with timing and truncated response data.

### Data Storage

**Current Implementation**: PostgreSQL database storage using Neon Serverless for persistence of verification results.

**Database Architecture**:
- **verification_checks** table: Stores each verification request (Wikipedia URL, ref tag name, source text, timestamp)
- **citation_results** table: Stores individual claim verification results (claim text, source excerpt, confidence score, support status, reasoning)
- Drizzle ORM with PostgreSQL dialect via @neondatabase/serverless
- Lazy initialization pattern prevents crashes when database is unavailable
- Graceful degradation: API continues serving verification requests even if database save fails

**Implementation Details**:
- Database initialization is deferred until first save attempt (lazy loading)
- No Neon client created at module import time to prevent startup crashes
- Failed database operations are logged but don't prevent API responses
- Schema migration managed via Drizzle Kit (`npm run db:push`)
- Connection requires DATABASE_URL environment variable

**Rationale**: While citations need real-time verification, storing results enables:
- Historical tracking of verification patterns
- Analysis of citation accuracy trends
- Potential future features like verification history dashboard

### External Dependencies

**AI Services (BYOK - Bring Your Own Key)**:
Users select their preferred AI provider and provide their own API key. Keys are stored only in browser session state and transmitted securely via HTTPS.

- **Claude (Anthropic)**: claude-sonnet-4-5 model - excellent at nuanced text analysis
  - Service: server/services/claude.ts
  - Get key from: console.anthropic.com
  
- **OpenAI**: GPT-4o model with JSON response format
  - Service: server/services/openai.ts
  - Get key from: platform.openai.com
  
- **Google Gemini**: gemini-2.0-flash model (using new @google/genai SDK)
  - Service: server/services/gemini.ts
  - Get key from: aistudio.google.com

All AI services return structured JSON with confidence scores, relevant excerpts, reasoning, and support status.

**Third-party APIs**:
- Wikipedia API (en.wikipedia.org/w/api.php) for fetching article wikitext
- Uses MediaWiki API action=query with revisions prop to retrieve current article content
- No authentication required for read-only access

**Database** (configured but not used):
- Neon Serverless PostgreSQL via @neondatabase/serverless
- Drizzle ORM for database operations
- Connection requires DATABASE_URL environment variable

**UI Libraries**:
- Radix UI primitives for accessible component foundation
- Lucide React for icons
- React Hook Form with Zod resolvers for form validation
- TanStack Query for data fetching and caching
- Wouter for routing

**Development Tools**:
- Vite for fast development and optimized production builds
- TypeScript for type safety across full stack
- ESBuild for server-side bundling
- Tailwind CSS with PostCSS for styling

**External Services Integration Pattern**: 
- Wikipedia API calls are wrapped in service layer (server/services/wikipedia.ts)
- Claude API calls isolated in service layer (server/services/claude.ts)
- Error handling abstracted at service level to provide clean error messages
- All external calls use axios for HTTP requests with proper error handling