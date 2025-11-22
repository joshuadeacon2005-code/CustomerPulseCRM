# Bloom & Grow Group - Customer Relations Management

## Overview
A comprehensive sales-focused CRM tool for Bloom & Grow Group, designed to streamline sales processes, manage customer journeys, and provide robust performance analytics. The application supports role-based access, multi-country customer data management, brand assignments, monthly target setting, to-do list management, and detailed sales reporting with budget vs. actuals. It aims to enhance sales team efficiency and provide actionable insights for business growth.

## User Preferences
- Default theme: Dark mode
- Design approach: Enterprise CRM (inspired by Linear/Notion/HubSpot)
- Information density: High (business productivity tool)
- Primary use case: Sales team customer relationship management with comprehensive tracking and reporting

## System Architecture
The application is built with a React and TypeScript frontend, an Express.js and TypeScript backend, and a PostgreSQL database.

**UI/UX Decisions:**
- **Theme**: Dark mode primary, light mode available via toggle.
- **Colors**: Orange primary, Teal secondary.
- **Typography**: Inter for UI and body text.
- **Components**: Professional design with subtle hover states and smooth transitions, utilizing Shadcn UI, Tailwind CSS, and Radix UI primitives.
- **Information Flow**: Role-based navigation and data filtering ensure users only see relevant information.
- **Dashboard Design**: Analytics and Admin dashboards provide comprehensive overviews with team structure visualization, performance metrics, and role-specific data.
- **Navigation Structure**: Sidebar navigation organized as Home, Admin Dashboard (role-based), Customers, Analytics, Segments, Sales Dashboard (at bottom). To Do List section removed in favor of integrated calendar and action items on dashboard. Sales reports are generated via a button in the Sales Dashboard header.
- **UI Spacing & Layout**: Consistent padding (p-6) and generous spacing (space-y-8, gap-6/8) across all major pages (Segments, Analytics, Customers, Sales, Dashboard, Admin) for improved readability and professional appearance. Modal headers include proper padding (pr-10) to prevent X button overlap. Loading states match production layouts to maintain visual consistency.

**Currency System:**
- **User-Level Currency Preference**: Each user can select their preferred currency (USD, HKD, SGD, CNY, AUD, IDR, MYR) via header selector.
- **Exchange Rates**: 49 pre-seeded exchange rate pairs stored in database for consistent conversion across the application.
- **Dual Storage**: All monetary values stored in both original currency and base currency (USD) to prevent data drift.
- **Server Validation**: Auto-calculates and validates baseCurrencyAmount on create/update to ensure consistency.
- **Schema Validation**: Zod refinements require currency when baseCurrencyAmount is provided, preventing invalid payloads.
- **Cache Management**: Targeted query invalidation on currency change refreshes all monetary displays.
- **Future Enhancement**: Currency conversion will be applied across all pages (Dashboard, Customers, Analytics, Admin) to display values in user's preferred currency.

**Technical Implementations & Feature Specifications:**
- **Authentication**: Passport-local strategy with scrypt password hashing and session management.
- **Role-Based Access Control**: Multi-level roles (CEO, Sales Director, Regional Manager, Manager, Salesman) with `managerId` for team hierarchy. Public registration is restricted to 'salesman'. Authorization middleware provides backward compatibility for legacy "admin" role. CEO and admin roles have identical permissions across all features for viewing team member data.
- **Permission Model**: Salespeople can only view and manage customers assigned to them (`assignedTo` = their user ID). Heads of Sales (Regional Manager, Sales Director roles) can view all customers within their regional office. Jamie (CEO) has special access to view all customers in Australia/New Zealand regional office in addition to standard CEO permissions.
- **Regional Office Management**: Users can be assigned to regional offices (Hong Kong, Singapore, Shanghai, Australia/New Zealand, Indonesia, Malaysia, Guangzhou).
- **Homepage Dashboard**: Role-based dashboard (`/dashboard`) with comprehensive productivity features:
  - **Today's Priorities**: Alert-style banner displaying overdue tasks, today's tasks, and customers needing follow-up (>14 days no contact) with quick action links
  - **Floating Quick Action Button**: Fixed bottom-right "+" menu providing instant access to Log Interaction, Log Sale, Add Customer, Add Lead, and Create Task actions from any page
  - **Global Search**: Command palette (Cmd+K) for searching across customers, interactions, and tasks with instant navigation
  - **Enhanced KPI Cards**: Five performance metrics (Target, Sales to Date, Progress, Monthly Interactions, New Customers) with month-over-month trend indicators (↑/↓ with percentages), color-coded progress bars (green/yellow/red), and full ARIA accessibility support
  - **At-Risk Customers Widget**: Displays up to 10 customers requiring attention (below target, no recent contact, or overdue follow-ups) with color-coded reason badges
  - **Team Performance Summary**: CEO/Manager-only widget showing team members' sales progress with visual indicators and drill-down links to user details
  - Interactive calendar view, filterable action items list, team member selector for managers/CEOs, and regional office display
- **Customer Management**: Comprehensive profiles with country dropdown selection (15 Asia-Pacific countries), main and additional contacts (with full edit/delete capabilities), notes, Bloom Connect marketplace integration, store address, structured retailer type selection (14 categories), quarterly soft targets with currency support (matching monthly target layout: two-column grid with amount + currency selector), last contact date, lead management (date of first contact, lead source), and interaction tracking with updated types (Call, Email, In Person Meeting, Virtual Meeting, Store Visit). Advanced filtering by brand and retailer type. View toggle allows switching between card/grid and table/list layouts with localStorage persistence across sessions. External system integration with optional NetSuite and BloomConnect URL fields, featuring prominent link buttons in customer detail modal that open URLs in secure new tabs (with noopener/noreferrer protection). **Multiple Addresses**: Full support for multiple addresses per customer with structured address fields (streetNumber, streetName, unit, building, district, city, stateProvince, postalCode, country) that auto-organize into formatted display. Each address includes address type selector, all structured fields in organized two-column layout, optional legacy full address field, Chinese address translation field, and additional translation notes. Features complete CRUD operations (add, edit, delete) with Drizzle ORM persistence and chronological sorting (newest first). Addresses display formatted from structured fields with fallback to legacy address field. Supports bulk address import via CSV with automatic assignment to correct customer records.
- **Excel Import System**: Comprehensive bulk customer import functionality with downloadable template, flexible column mapping (handles variations like "Store Address" vs "Office Address"), empty row handling, duplicate detection (by name and email), currency enforcement (defaults to HKD with automatic USD conversion), brand assignment (comma-separated), main contact creation, structured error tracking (row number, company name, error message), and HTTP status codes (200/207/400/500) for proper error handling. Import UI features file selection, upload progress, and detailed summary report showing total/successful/failed/skipped counts with expandable error details.
- **Brand Management**: Many-to-many relationship for multi-brand assignment per customer with inline brand creation. Available brands include Beaba, Behue, Matchstick Monkey, Bubble, Childhome, Cogni Kids, Dew, Done By Deer, Ergobaby, Etta Loves, Koala Eco, Le Toy Van, Pearhead, Skip Hop, Snuggle Me, Suavinex, Trunki, and Ubbi (Behue and Matchstick Monkey are separate brands).
- **Target Management**: Supports Personal and General monthly sales targets, with role-based setting capabilities, integrated into the Sales Dashboard.
- **Customer Monthly Targets**: Per-customer monthly sales targets with full CRUD operations in dedicated Targets tab within customer detail modal. Features optimistic UI updates for instant responsiveness, security-enhanced ownership validation preventing cross-customer data tampering, and chronological sorting (newest first). Uses shared edit dialog pattern to avoid click handler conflicts.
- **To Do List**: Task management with status tracking, color coding, visit/call logging, and CSV bulk import.
- **CSV Todo Import**: Flexible CSV import for bulk uploading todos with server-side validation, field mapping, date validation, customer assignment, and error handling.
- **Sales Tracking & Reporting**: Monthly sales tracking per customer with budget vs. actuals and variance reporting. Performance reports track sales against targets. Product Name field removed; products now default to "General Sale".
- **Analytics**: Advanced analytics with monthly and overall views, month selector for historical analysis, team structure visualization, team performance metrics, and user ID to name mapping.
- **Admin Dashboard Features**:
  - **Regional Leaderboard**: Prominent card displaying top 3 best performing salespeople sorted by total revenue, with Trophy (1st - gold), Medal (2nd - silver), and Award (3rd - bronze) icons from lucide-react. Shows salesperson name, role, regional office, total revenue, and number of sales. Replaces previous Salespeople Performance section for cleaner, more focused design.
  - **User Management**: Filtering, sorting, bulk selection, and inline editing with password hashing. Role-based manager assignment with automatic managerId clearing for non-salesman roles. Case-insensitive role checks for backward compatibility.
- **Lead Source Tracking**: Structured dropdown for lead sources (Referral, Cold Call, Bloom Connect, Others with conditional text field).
- **Calendar View on Dashboard**: Interactive calendar (using react-big-calendar) replacing the To Do List widget, displaying both action items and customer interactions. Features color-coded events (overdue/today/upcoming/completed tasks, interactions), multiple view modes (month/week/day/agenda), proper timezone handling with parseISO and startOfDay, filtering by user's assigned customers, and clickable events that open a dialog showing full action item or interaction details with ability to mark items complete/incomplete.
- **Action Items Management**: Comprehensive filterable action items list below the calendar with filters for customer (dropdown) and status (All/Pending/Completed/Overdue). Displays up to 10 items with color-coded status badges, overdue indicators, and quick completion toggle. Shows customer name, due date, and status for each item.
- **Enhanced Dashboard Metrics**: Five performance cards showing Target, Sales to Date, Progress percentage with visual progress bar, Monthly Interactions count (number of customer interactions this month), and New Customers count (customers added this month based on first contact date). All metrics are role-based and filter according to user's assigned customers or team hierarchy.
- **AI-Powered Insights**: OpenAI integration (GPT-4o-mini via Replit AI Integrations) providing intelligent analysis:
  - **Customer AI Insights**: Dedicated tab in customer detail modal analyzing sales performance, purchasing patterns, engagement metrics, and providing actionable recommendations. Displays quick stats (Total Sales, Avg Monthly Sales, Interaction Count, Last Contact) and AI-generated insights with secure authorization (user must be assigned to customer, admin, or manager of assigned user).
  - **User Performance AI Summary**: Admin page AI button (Sparkles icon) next to each user in management table. Generates comprehensive performance analysis including sales vs targets, customer engagement, team dynamics, and coaching recommendations. Authorization enforces hierarchical access (own performance, admin roles, or direct manager only).
  - **Sales Forecasting**: AI endpoint for predictive analytics based on historical sales data and current trends (endpoint ready, UI integration pending).
  - **Interaction Note Summarization**: AI-powered summarization of interaction notes for quick insights (endpoint ready, UI integration pending).
  - Security: All AI endpoints enforce role-based authorization with team hierarchy validation to prevent cross-team data exposure.

**System Design Choices:**
- **Frontend Framework**: React 18 with TypeScript, Wouter for routing, TanStack Query for data fetching.
- **Backend Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL hosted on Neon, Drizzle ORM for interactions.
- **Validation**: Zod for schema validation integrated with react-hook-form.
- **Date Handling**: `date-fns`.

## External Dependencies
- **Frontend**:
    - React 18
    - TypeScript
    - Wouter
    - TanStack Query
    - Shadcn UI
    - Tailwind CSS
    - Radix UI primitives
    - react-hook-form
    - Zod
    - date-fns
    - papaparse
- **Backend**:
    - Express.js
    - TypeScript
    - Passport.js
    - Node.js crypto
    - Drizzle ORM
    - connect-pg-simple
    - Zod
    - OpenAI SDK (via Replit AI Integrations)
- **Database**:
    - PostgreSQL (Neon)
- **AI/ML**:
    - OpenAI GPT-4o-mini (via Replit AI Integrations, uses Replit credits)