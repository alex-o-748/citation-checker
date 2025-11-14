# Design Guidelines: Wikipedia Citation Verification Tool

## Design Approach
**System-Based Approach**: Inspired by Linear and Notion for clean, focused productivity tools with Material Design patterns for data display. This is a utility-first application where clarity and efficiency drive all design decisions.

## Core Design Principles
1. **Information Clarity**: Every element serves the verification workflow
2. **Scannable Results**: Users must quickly assess citation validity
3. **Trust Through Simplicity**: Clean, uncluttered interface builds confidence in AI analysis
4. **Reading Comfort**: Optimized for extended text comparison sessions

## Typography System
- **Primary Font**: Inter or SF Pro Display via Google Fonts CDN
- **Reading Font**: Georgia or serif font for Wikipedia/source text display
- **Hierarchy**:
  - H1 (App Title): 2xl, font-semibold
  - H2 (Section Headers): xl, font-semibold  
  - Body (Input/Results): base, regular
  - Reading Text: lg, serif for improved readability
  - Metadata/Labels: sm, font-medium
  - Confidence Scores: 2xl, font-bold for prominence

## Layout System
**Spacing Primitives**: Tailwind units of 3, 4, 6, and 8 (p-4, gap-6, my-8)

**Container Strategy**:
- Max width: max-w-5xl for main content
- Two-column comparison views: max-w-7xl
- Padding: px-6 md:px-8 for breathing room

## Component Library

### Input Section
- **Wikipedia URL Input**: Full-width text field with clear label, placeholder showing example URL
- **Source Text Area**: Large textarea (min-h-64) with monospace-style border, line numbers suggested
- **Source Identifier Input**: Medium text field for citation number/author name
- **Submit Button**: Primary CTA, full-width on mobile, auto-width on desktop

### Results Display
- **Verification Cards**: Each citation instance shown in individual card
  - Citation text from Wikipedia (serif, quoted style)
  - Relevant source excerpt (serif, highlighted)
  - Confidence percentage (large, color-coded indicator)
  - Support status badge (Supported/Not Supported/Partial)
  
- **Comparison Layout**: Side-by-side on desktop (grid-cols-2), stacked on mobile
  - Left: Wikipedia claim
  - Right: Source excerpt
  - Divider line between columns

- **Status Indicators**:
  - High confidence (>80%): Success state
  - Medium confidence (50-80%): Warning state  
  - Low confidence (<50%): Error state

### Navigation
- **Header**: Simple app title, optional settings/info icon
- **Footer**: Minimal attribution or version info

### Forms
- Clear labels above all inputs
- Helper text below complex fields
- Validation states with inline error messages
- Loading states for AI processing (skeleton loaders or spinner)

## Interaction Patterns
- **Progressive Disclosure**: Show results section only after analysis complete
- **Expandable Details**: Click citation card to see full context
- **Copy to Clipboard**: Quick action for sharing verification results
- **Minimal Animation**: Subtle fade-in for results, smooth scrolling to results section

## Accessibility
- ARIA labels on all form inputs
- Keyboard navigation for all interactive elements
- Focus indicators with 2px outline
- Color-blind safe status indicators (icons + text, not just color)

## Images
**No hero image required**. This is a utility application focused on workflow efficiency. Visual elements limited to:
- Optional small logo/icon in header (32px)
- Status icons in verification results (16-24px from Heroicons)

## Icons
**Heroicons** via CDN for:
- Check circle (verified)
- X circle (not supported)  
- Exclamation triangle (partial/uncertain)
- Document text (source indicator)
- Clipboard (copy action)

## Key Layout Details
- **Single-page application**: All functionality on one view
- **Vertical workflow**: Input section → Results section (natural scroll)
- **Responsive breakpoint**: md:grid-cols-2 for comparison views
- **Fixed header**: Optional sticky header with app title for context during scroll
- **Content max-width**: Optimize for reading, not full-screen stretch