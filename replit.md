# Wikipedia Citation Verification Tool

## Overview

This is a Wikipedia citation verification tool that uses AI to validate whether citations in Wikipedia articles are accurately supported by their source materials. Users input a Wikipedia URL, specify a citation reference tag, and provide the source text. The system then extracts all instances where that citation is used, and uses Claude AI to verify each claim against the provided source material, returning confidence scores and detailed analysis.

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

**Current Implementation**: Stateless architecture with no persistent storage required. All citation verification is performed on-demand.

**Database Configuration**: Drizzle ORM is configured with PostgreSQL dialect (via Neon serverless driver) but not actively used. The configuration exists for potential future features like:
- Saving verification history
- Caching verification results
- User accounts and saved projects

**Rationale**: Citations need real-time verification against current source material, making caching less valuable. The tool is designed as a one-off verification utility rather than a persistent data application.

### External Dependencies

**AI Service**: Anthropic Claude API (claude-sonnet-4-5 model)
- Used for fact-checking claims against source text
- Returns structured JSON with confidence scores, relevant excerpts, reasoning, and support status
- Requires ANTHROPIC_API_KEY environment variable
- Model updated November 2024 to use latest Claude Sonnet 4.5 (best coding model)

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