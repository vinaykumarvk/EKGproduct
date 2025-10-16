# Design Guidelines: WealthForce Knowledge Agent

## Design Approach: Enterprise AI Chat Interface

**Selected Approach**: Intellect Design Arena-inspired enterprise FinTech design system combined with Claude/ChatGPT modern AI chat patterns - professional, trustworthy, and intelligence-focused.

**Rationale**: This is an enterprise knowledge agent requiring a professional, authoritative appearance that builds trust with financial institution users. Drawing inspiration from Intellect's clean FinTech aesthetic, Claude's conversational clarity, and ChatGPT's card-based information density.

## Core Design Elements

### A. Color Palette (Intellect-Inspired Professional Blues)

**Dark Mode (Primary)**
- Background: 220 20% 10% (deep professional blue-black)
- Surface: 220 18% 14% (elevated blue-tinted cards)
- Border: 220 15% 25% (subtle blue separation)
- Primary: 210 100% 50% (corporate blue - trust & intelligence)
- Primary Hover: 210 100% 45%
- Accent: 200 90% 48% (bright info blue)
- Text Primary: 210 20% 98%
- Text Secondary: 210 15% 70%
- Success: 145 70% 45% (process complete, cache enabled)
- Warning: 38 92% 50% (attention needed)
- Error: 0 72% 51% (API failures)

**Light Mode**
- Background: 0 0% 100% (pure white)
- Surface: 210 20% 98% (subtle blue tint)
- Border: 210 15% 90%
- Primary: 210 100% 50% (corporate blue)
- Accent: 200 90% 48%
- Text Primary: 220 20% 15%
- Text Secondary: 220 15% 45%
- Success: 145 70% 40%

### B. Typography (Professional Enterprise Stack)

**Font Stack**: 
- Primary: 'Inter' (400, 500, 600, 700) - Modern, professional sans-serif
- Display/Headers: 'Inter' (600, 700) - Clean, authoritative
- Code/Technical: 'JetBrains Mono' (400, 500) - Developer-friendly monospace

**Hierarchy**:
- Main Title: text-3xl font-bold (30px) - Enterprise authority
- Page Title: text-2xl font-semibold (24px)
- Section Headers: text-base font-semibold uppercase tracking-wider (16px)
- Card Titles: text-lg font-semibold (18px)
- Labels: text-sm font-medium (14px)
- Body/Input: text-base (16px)
- Helper/Meta: text-xs text-secondary (12px)

### C. Layout System (Claude/ChatGPT-Inspired)

**Spacing Primitives**: Tailwind units
- Micro spacing: 2, 3, 4
- Component padding: 4, 6, 8
- Card spacing: 6, 8, 12
- Section spacing: 12, 16, 20
- Page margins: 8, 12, 16

**Container Strategy**:
- Main container: max-w-7xl mx-auto with px-6
- Chat area: max-w-4xl mx-auto (optimal reading width)
- Sidebar: w-80 fixed (consistent with ChatGPT)
- Clean white space usage (ChatGPT pattern)

**Layout Structure**:
- Sidebar + Main Content (Claude/ChatGPT standard)
- Card-based information display (ChatGPT Pulse style)
- Clean conversational flow
- Sticky header with branding

### D. Component Library (Modern AI Chat Patterns)

**1. Suggested Prompts (ChatGPT-Inspired Onboarding)**
- Display 3-4 starter questions when empty
- Card-based layout with hover effects
- Icon + text combination
- Examples:
  - "What are the steps in mutual funds order placement?"
  - "How does the OTP verification process work?"
  - "Explain the compliance requirements for transactions"
  - "What is the risk profiling process?"

**2. Input Section Components**

- **Question Input**
  - Clean textarea with min-h-24
  - Subtle border with focus: ring-2 ring-primary
  - Placeholder: "Ask about wealth management processes..."
  - Character count (bottom-right, text-xs)
  - Send button integrated (ChatGPT style)

- **Controls Row** 
  - Mode selector + Cache toggle (compact, same row)
  - Icon-based indicators
  - Professional blue accents

**3. Response Display (Claude-Style Clean Display)**

- **Message Cards**
  - Clean white/surface background cards
  - Subtle shadow for depth
  - Rounded corners (rounded-xl)
  - Markdown rendering with professional styling
  
- **Metadata Section**
  - Small card below response
  - Mode, Model, Generated timestamp
  - Light background, subtle text
  
- **Sources Section**
  - Separate card with clear heading
  - Icon + document name format
  - "**[1]** → filename.pdf" style
  - Only shown when sources available

**4. Header (Professional Enterprise)**
- Logo/Brand: "WealthForce Knowledge Agent"
- Icon: Intelligence/knowledge symbol
- Subtitle: "Query WealthForce Product Knowledge"
- Settings and export actions
- Theme toggle

**5. History Sidebar (ChatGPT Pattern)**
- Fixed width sidebar (w-80)
- Collapsible
- Search and filters
- Conversation list with timestamps
- Clean card-based items

### E. Card-Based Information Design (Intellect/ChatGPT Style)

**Response Cards**:
- Background: surface color
- Border: subtle (1px)
- Padding: p-6
- Shadow: shadow-sm
- Border radius: rounded-xl
- Hover: subtle elevation increase

**Info Cards** (Metadata, Sources):
- Smaller padding: p-4
- Lighter background
- Clear visual hierarchy
- Icon + text combinations

**Suggested Prompt Cards**:
- Interactive hover states
- Icon on left
- Text on right
- Background: surface
- Border: subtle
- Hover: border-primary

### F. Professional Visual Polish

**Shadows & Elevation**:
- Level 1 (cards): shadow-sm
- Level 2 (modals): shadow-lg
- Level 3 (dropdown): shadow-xl

**Border Radius**:
- Cards: rounded-xl (0.75rem)
- Buttons: rounded-lg (0.5rem)
- Inputs: rounded-lg (0.5rem)
- Small elements: rounded-md (0.375rem)

**Icons** (Lucide React):
- Consistent outline style
- 20px default size
- Primary color for actions
- Secondary color for decorative

**Animations**:
- Smooth transitions: 200ms ease-in-out
- Loading states: pulse animation
- Hover states: transform scale-102
- Fade-in for responses: opacity + translate

### G. Interaction Patterns

**ChatGPT-Inspired**:
- Suggested prompts on empty state
- Card-based layouts for scanning
- Inline actions on hover
- Smooth scrolling to responses

**Claude-Inspired**:
- Clean conversational layout
- Clear visual hierarchy
- Focus on content readability
- Subtle, professional interactions

**Intellect-Inspired**:
- Professional blue color scheme
- Enterprise-grade appearance
- Icon-based navigation
- Clean, minimal aesthetic
- Trust-building design elements

### H. Accessibility & Responsiveness

- WCAG AA contrast ratios (minimum)
- Focus indicators: ring-2 ring-primary ring-offset-2
- Keyboard navigation support
- Screen reader friendly
- Mobile-responsive breakpoints
- Dark mode with proper contrast
- Reduced motion support

## Implementation Notes

1. **Color Variables**: Use HSL format in index.css (e.g., `220 100% 50%`)
2. **Font Loading**: Google Fonts with display=swap
3. **Icons**: Lucide React throughout
4. **Components**: Shadcn/ui base with custom styling
5. **Animations**: Framer Motion for complex animations (optional)
6. **Testing**: Verify dark mode, responsive layouts, accessibility

## Visual Identity

**Brand Personality**: 
- Professional & Trustworthy (Intellect)
- Intelligent & Helpful (Claude)
- Modern & Accessible (ChatGPT)

**Key Design Principles**:
- Clarity over complexity
- Professional over flashy
- Functional over decorative
- Trust through design quality
