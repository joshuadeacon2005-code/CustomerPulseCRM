# CRM Tool - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Material Design + Enterprise Best Practices)

**Justification:** As a utility-focused, information-dense productivity tool, the CRM requires consistent patterns, clear hierarchy, and efficient workflows. Drawing inspiration from Linear, Notion, and modern CRMs like HubSpot.

**Key Design Principles:**
- Clarity over decoration: Information hierarchy must be immediately apparent
- Efficiency-first: Minimize clicks, maximize visibility of critical data
- Professional restraint: Sophisticated color use without overwhelming the interface
- Scannable layouts: Dense information presented in digestible chunks

## Core Design Elements

### A. Color Palette

Inspired by Bloom and Grow Group's warm, welcoming brand identity.

**Dark Mode (Primary):**
- Background: 25 20% 12% (warm dark canvas)
- Surface: 25 18% 16% (cards, panels)
- Surface Elevated: 25 18% 20% (modals, dropdowns)
- Border: 25 15% 25%
- Text Primary: 30 10% 95%
- Text Secondary: 30 8% 65%

**Light Mode:**
- Background: 30 40% 98% (warm, soft beige)
- Surface: 0 0% 100% (white cards)
- Border: 30 20% 88%
- Text Primary: 25 30% 15%
- Text Secondary: 25 20% 45%

**Semantic Colors (Both Modes):**
- Primary (Actions): 18 85% 55% (vibrant orange - Bloom & Grow signature)
- Secondary (Support): 175 45% 50% (teal - complementary accent)
- Success (Customer stage): 175 45% 50% (teal)
- Warning (Prospect stage): 45 90% 55% (golden yellow)
- Info (Lead stage): 200 75% 50% (sky blue)
- Danger (Critical items): 0 72% 51% (red)

**Status-Specific Colors:**
- Lead: 200 75% 50% (sky blue)
- Prospect: 45 90% 55% (golden yellow)
- Customer: 175 45% 50% (teal)

### B. Typography

**Font Families:**
- Primary: 'Inter' (UI elements, body text, data)
- Monospace: 'JetBrains Mono' (IDs, timestamps, codes)

**Type Scale:**
- Headline: 2rem / font-bold (Dashboard titles)
- Title: 1.5rem / font-semibold (Section headers)
- Subtitle: 1.125rem / font-medium (Card titles)
- Body: 0.875rem / font-normal (Primary content)
- Caption: 0.75rem / font-normal (Metadata, timestamps)
- Label: 0.8125rem / font-medium (Form labels, badges)

### C. Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16** exclusively
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4
- Form fields: space-y-4
- Dashboard margins: m-8 to m-12

**Grid System:**
- Dashboard: 12-column grid with 16px gutters
- Sidebar: Fixed 280px width (sidebar navigation)
- Main content: flex-1 with max-w-7xl container
- Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

### D. Component Library

**Navigation:**
- Top bar: Fixed header with logo, search, user menu (h-16, bg-surface)
- Sidebar: Customer stages, filters, quick actions (w-72, collapsible on mobile)
- Breadcrumbs: Show current location in hierarchy

**Data Display:**
- Customer Cards: Compact cards showing name, stage badge, score, last interaction
- Customer Table: Sortable columns (Name, Stage, Score, Last Contact, Assigned To)
- Interaction Timeline: Vertical timeline with icons for each interaction type
- Score Badge: Circular indicator with color-coded ranges (0-30 low, 31-70 medium, 71-100 high)

**Forms:**
- Input Fields: Outlined style with floating labels, h-12
- Select Dropdowns: Custom styled with chevron icons
- Date Pickers: Inline calendar for interaction dates
- Text Areas: For interaction descriptions (min-h-24)
- Multi-select: For assigning tags/segments

**Action Components:**
- Primary Button: bg-primary, h-10, rounded-lg, font-medium
- Secondary Button: border variant with bg-transparent
- Icon Buttons: Square 40px with subtle hover states
- Floating Action Button: Add customer/interaction (fixed bottom-right)

**Feedback:**
- Toast Notifications: Top-right corner, auto-dismiss
- Status Badges: Pill-shaped, uppercase text, 0.75rem
- Loading States: Skeleton screens for data tables
- Empty States: Centered icon + message + CTA

**Modals & Overlays:**
- Customer Detail Modal: Full-screen on mobile, max-w-4xl on desktop
- Quick Add Form: Slide-in from right (w-96)
- Confirmation Dialogs: Centered, max-w-md

**Dashboard Widgets:**
- Stat Cards: 3-column grid showing total leads/prospects/customers
- Score Distribution Chart: Horizontal bar chart
- Recent Interactions: List view with timestamps
- Sales Rep Assignment: Avatar + customer count

### E. Animations

Use sparingly for micro-interactions only:
- Modal/drawer entry: slide-in (200ms ease-out)
- Dropdown menus: fade-in (150ms)
- Button hover: subtle scale (1.02) or background shift
- No page transitions or scroll animations

## Images

This is a data-centric business application - **no hero images needed**. Use functional imagery only:
- Avatar placeholders: Initials on colored backgrounds
- Empty state illustrations: Simple line-art icons (customer icon, interaction icon)
- Sales rep photos: Small circular avatars (40px diameter)