# Graph Query Assistant - WealthEKG Chatbot

## Overview
A beautiful, production-ready chatbot interface for querying graph databases using AI-powered insights. The application connects to the WealthEKG Gradio service and provides a polished user experience with markdown-formatted responses, multiple query modes, and caching options.

## Current State (October 16, 2025)
✅ **Fully functional MVP** - All features tested and working perfectly
- Question input with real-time character count
- Three query modes: Balanced, Deep, Customer-Selected (concise)
- Cache toggle for refresh control
- Markdown-formatted response display
- Copy to clipboard functionality
- Light/Dark theme support
- Comprehensive error handling
- Beautiful loading states and animations

## Features Implemented

### Core Functionality
1. **Query Interface**
   - Large textarea for question input with character counter
   - Mode selector dropdown (Balanced/Deep/Customer-Selected)
   - Cache toggle switch with visual feedback
   - Submit button with loading states
   - Enter to submit, Shift+Enter for newlines

2. **Response Display**
   - Markdown rendering with proper styling
   - Code blocks with JetBrains Mono font
   - Loading skeleton animations
   - Error messages displayed inline with red border
   - Success state with green border
   - Copy response to clipboard

3. **User Experience**
   - Theme toggle (light/dark mode) - preserved in localStorage
   - Responsive design (desktop two-column, mobile stacked)
   - Toast notifications for actions
   - Disabled states during processing
   - Empty state messages

## Project Structure

### Frontend (`client/src/`)
- **pages/chatbot.tsx** - Main chatbot interface with all UI logic
- **components/theme-provider.tsx** - Dark/light mode management
- **App.tsx** - Main app with routing and providers
- **lib/queryClient.ts** - TanStack Query configuration

### Backend (`server/`)
- **routes.ts** - API endpoint for Gradio integration
  - POST `/api/query` - Processes questions and returns markdown responses
  - Validates input with Zod schemas
  - Extracts string from Gradio array response
  - Comprehensive error handling

### Shared (`shared/`)
- **schema.ts** - TypeScript types and Zod schemas
  - Query schema: question, mode, refresh
  - Response schema: data (markdown), error

## API Integration

### Gradio Service
- Endpoint: `vinaykumarvk/WealthEKG`
- Method: `/process_question`
- Package: `@gradio/client`
- Response time: 30-60 seconds (slow but working)

### Request Payload
```typescript
{
  question: string,
  mode: "balanced" | "deep" | "concise",
  refresh: boolean
}
```

### Response Format
```typescript
{
  data: string, // Markdown-formatted response
  error?: string // Optional error message
}
```

## Design System

### Color Palette
Following Linear/Notion-inspired design system:
- **Primary**: Vibrant blue (220 90% 56%) for actions
- **Success**: Green (142 76% 36%) for cache/success states
- **Destructive**: Red (0 84% 60%) for errors
- **Background**: Deep charcoal (15 8% 8%) in dark mode
- **Surface**: Elevated cards (15 8% 12%)

### Typography
- **Primary Font**: Inter (400, 500, 600)
- **Code Font**: JetBrains Mono (400, 500)
- Title: 2xl font-semibold
- Labels: sm font-medium uppercase
- Body: base (16px)

### Spacing
- Micro spacing: 2, 4
- Component padding: 6, 8
- Section spacing: 12, 16
- Max-width: 5xl with mx-auto

## Technical Stack

### Dependencies
- **@gradio/client** - Gradio API integration
- **react-markdown** - Markdown rendering
- **@tanstack/react-query** - Data fetching/mutations
- **wouter** - Routing
- **zod** - Schema validation
- **lucide-react** - Icons
- **shadcn/ui** - UI components

### Key Patterns
- Schema-first development with TypeScript
- TanStack Query for async state management
- Controlled forms with real-time validation
- Error boundaries with inline error display
- Optimistic UI updates

## Testing
✅ All end-to-end tests passing:
- Question submission across all modes
- Cache toggle functionality
- Response rendering and copy feature
- Theme switching
- Loading/error/empty states
- Responsive design verification

## Known Behaviors
- Gradio API responses can take 30-60 seconds (external service limitation)
- Theme preference persists in localStorage
- Empty question input disables submit button
- Keyboard shortcuts: Enter to submit, Shift+Enter for newlines

## Future Enhancements (User Requested)
- Chat history to view previous Q&A
- Request/response caching on frontend
- Conversation export (markdown, PDF)
- Advanced filters and search in history
- API authentication support (when switching from public API)

## Development Commands
- `npm run dev` - Start development server (port 5000)
- Workflow: "Start application" - Auto-restart on changes

## Notes
- No database used (stateless application)
- No authentication required (public API)
- All state managed in React components
- Follows design_guidelines.md religiously
