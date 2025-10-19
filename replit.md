# WealthForce Knowledge Agent - Enterprise AI Assistant

## Overview
The WealthForce Knowledge Agent is an enterprise-grade conversational AI chatbot, inspired by ChatGPT and Claude, designed to provide an intelligent knowledge base for wealth management professionals. Its primary purpose is to offer a sophisticated interface with full conversational threading, context maintenance, and persistent chat history, enhancing knowledge retrieval and interaction for financial experts. The project aims to deliver a professional, intuitive, and highly functional AI assistant.

## User Preferences
I prefer simple language and detailed explanations. I want iterative development with frequent, small updates rather than large, infrequent ones. Ask before making major changes to the architecture or core functionalities. Do not make changes to the `shared/` folder without explicit instruction.

## System Architecture
The application employs a professional, enterprise-grade architecture focused on conversational AI.

### UI/UX Decisions
The UI is inspired by ChatGPT, featuring a two-column layout with a fixed sidebar (256px) and a main content area. It includes a fixed header and footer for consistent navigation and input.
- **Color Palette**: Uses a vibrant blue for primary actions and user messages, gray tones for assistant messages, and a deep charcoal background with elevated surfaces for dark mode.
- **Typography**: Employs Inter for UI text and system fonts for messages, with a monospace font for code blocks.
- **Message Display**: User messages are displayed in blue bubbles on the right, while assistant messages are in gray bubbles on the left, rendered with comprehensive markdown support including HTML, citation superscripts, and code blocks with syntax highlighting. Source documents with relevance scores are displayed below assistant messages.
- **Theme**: Supports light/dark mode, with preferences persisting in local storage.

### Technical Implementations
- **Conversational Threading**: A hybrid approach uses API-driven context chaining (`conversation_id` or `response_id`) for real-time context and PostgreSQL for persistent storage of threads and messages. `conversation_id` is prioritized for long-running context.
- **Frontend State Management**: Utilizes React with TanStack Query for data fetching, caching, optimistic UI updates, and automatic cache invalidation.
- **Message Architecture**: Stores individual user and assistant messages, enabling flexible display and retrieval.
- **Thread Management**: Automatically creates new threads, generates titles, allows switching, searching, and deleting threads, and updates last activity timestamps.
- **Error Handling**: Comprehensive error handling is implemented across the application, with inline error messages and toast notifications.
- **Loading States**: Features beautiful loading states and animations for a smooth user experience.

### Feature Specifications
- **Core Conversational Interface**: ChatGPT-style scrolling message view with fixed input, auto-scroll, and keyboard shortcuts (Enter to send, Shift+Enter for newlines).
- **Context Maintenance**: Automatic inclusion of `conversation_id` or `response_id` in follow-up questions to maintain server-side context.
- **Markdown Rendering**: Robust markdown rendering for assistant messages, supporting GitHub-flavored markdown, HTML rendering (citations, links), HTML entity decoding, and removal of Knowledge Graph tags.
- **Sources Display**: Shows up to 3 source documents with filenames, relevance scores, and full source count below assistant messages.
- **User Experience**: Includes theme toggle, responsive design, toast notifications, disabled states during processing, and welcoming empty states.

### System Design Choices
- **Schema-first development**: Uses TypeScript and Zod for strict schema validation.
- **Optimistic UI updates**: Enhances responsiveness by updating the UI immediately.
- **Component composition**: Structures the UI with reusable components.
- **Fixed Layout**: Ensures the input area is always visible at the bottom.
- **Database**: PostgreSQL is used for all persistence, with Drizzle ORM managing schema and interactions.

## External Dependencies

- **EKG REST Service**:
    - Endpoint: `https://ekg-service-47249889063.europe-west6.run.app/v1/answer`
    - Purpose: Provides AI-powered answers, context management (`response_id`, `conversation_id`), and source document retrieval.
    - Integration: Native `fetch` API.

- **PostgreSQL**:
    - Purpose: Primary database for persisting conversation threads and messages.
    - Integration: `drizzle-orm` for ORM, `@neondatabase/serverless` for client.

- **NPM Packages**:
    - `react-markdown`, `rehype-raw`, `remark-gfm`: Markdown rendering and extensions.
    - `@tanstack/react-query`: Data fetching and state management.
    - `wouter`: Routing.
    - `zod`: Schema validation.
    - `lucide-react`: Icons.
    - `shadcn/ui`: UI component library.
    - `date-fns`: Date formatting utilities.