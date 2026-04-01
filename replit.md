# Bloom & Grow Group - Customer Relations Management

## Overview
A comprehensive sales-focused CRM tool for Bloom & Grow Group, designed to streamline sales processes, manage customer journeys, and provide robust performance analytics. It supports role-based access, multi-country customer data management, brand assignments, monthly target setting, and detailed sales reporting with budget vs. actuals. The application aims to enhance sales team efficiency and provide actionable insights for business growth.

## AGENT DATA SAFETY RULE — READ FIRST
**The agent must NEVER modify, insert, update, or delete any data in the development database while working.**
- All database access during development work is READ-ONLY (queries and inspection only).
- The only exception is when the user explicitly asks for a specific data change and confirms it in the chat.
- Code changes (schema, routes, UI) are fine — touching live data records is not, unless directly instructed.

## User Preferences
- Default theme: Light mode
- Design approach: Enterprise CRM (inspired by Linear/Notion/HubSpot)
- Information density: High (business productivity tool)
- Primary use case: Sales team customer relationship management with comprehensive tracking and reporting

## System Architecture
The application uses a React and TypeScript frontend, an Express.js and TypeScript backend, and a PostgreSQL database.

**UI/UX Decisions:**
- **Theme & Branding**: Light mode primary (dark mode available via toggle) with an orange and teal color scheme. Inter font for typography.
- **Components**: Professional design utilizing Shadcn UI, Tailwind CSS, and Radix UI primitives for subtle interactions and smooth transitions.
- **Information Flow**: Role-based navigation and data filtering ensure users see only relevant information.
- **Dashboards**: Analytics and Admin dashboards offer comprehensive overviews, team structure visualization, and role-specific performance metrics.
- **Navigation**: Sidebar includes Home, Admin Dashboard (role-based), Customers, Analytics, Segments, Pipeline, and Sales Dashboard.
- **Layout**: Consistent padding and spacing across all major pages for improved readability.

**Currency System:**
- **User Preference**: Users can select their preferred currency (USD, HKD, SGD, CNY, AUD, IDR, MYR).
- **Exchange Rates**: 49 pre-seeded exchange rate pairs for consistent conversion.
- **Dual Storage**: Monetary values are stored in both original and base currency (USD) to prevent data drift.
- **Validation**: Server-side validation ensures consistency of `baseCurrencyAmount` on create/update, with Zod refinements for schema validation.
- **Cache Management**: Targeted query invalidation on currency changes refreshes displays.

**Technical Implementations & Feature Specifications:**
- **Authentication & RBAC**: Passport-local strategy with scrypt hashing, session management, and multi-level role-based access control with `managerId` for team hierarchy. Public registration is restricted to 'salesman'.
  - **Role Hierarchy & Permissions**:
    - **CEO**: Full system access - can create/edit/delete users, manage offices, view all data, set targets
    - **Sales Director**: Admin access - can create/edit users, view all sales data, manage team members
    - **Marketing Director**: Admin access - can create/edit users, view all data, manage marketing initiatives
    - **Regional Manager**: Admin access - can create/edit users, manage offices, oversee regional teams
    - **Manager**: Admin access - can create/edit users assigned to them, view team data
    - **Salesman**: Basic access - can view/edit their own customers and data only
  - **Permission Middleware**:
    - `isAdmin`: CEO, Sales Director, Marketing Director, Admin, Regional Manager, Manager
    - `isCEO`: CEO, Sales Director, Marketing Director, Admin
    - `isManager`: CEO, Sales Director, Marketing Director, Admin, Regional Manager, Manager
  - **Note**: Role comparisons are case-insensitive (e.g., "CEO" and "ceo" are treated the same)
- **Pipeline Page**: Visual drag-and-drop kanban board for managing customer stages with:
    - **Filter Controls**: Country and salesperson dropdown filters with clear button
    - **Customer Cards**: Display customer name, country, and assigned salesperson
    - **Drill-down Modal**: Click any card to open full CustomerDetailModal with all customer info
    - **Drag-and-Drop**: Move customers between stages (Lead, Prospect, Qualified, Negotiation, Closed Won, Closed Lost)
    - **Pipeline Metrics**: Summary cards showing total customers, value, and conversion rates
- **Regional Office Management**: Users can be assigned to specific regional offices with the following features:
    - **Offices**: 8 pre-seeded regional offices (Hong Kong, Singapore, Shanghai, Australia, New Zealand, Indonesia, Malaysia, Guangzhou)
    - **Office Assignments**: Supports three role types (salesman, manager, viewer) for different access levels
    - **Single-Office Restriction**: Salesmen can only be assigned to one office at a time (enforced at storage layer)
    - **Multi-Office Access**: Managers can be assigned to multiple offices to oversee multiple regions
    - **Office-Based Data Visibility**: Customers can be assigned to offices; managers and salesmen see customers from their assigned offices
    - **Admin UI**: "Offices" tab in Admin Dashboard for viewing offices, assigned users, and managing assignments
    - **Customer Linking**: Customers have an optional `officeId` field to link them to specific offices
    - **Regional Default Currency**: Each office has a default currency (HKD, SGD, CNY, AUD, IDR, MYR, USD) that automatically sets the currency for new sales records created by users assigned to that office
- **Homepage Dashboard**: Role-based productivity dashboard (`/dashboard`) featuring:
    - **Today's Priorities**: Banners for overdue tasks, today's tasks, and follow-up reminders.
    - **Quick Action Button**: Floating "+" button for common actions like logging interactions or adding customers.
    - **Global Search**: Command palette (Cmd+K) for searching customers, interactions, and tasks.
    - **KPI Cards**: Five performance metrics with month-over-month trends and accessibility support.
    - **At-Risk Customers Widget**: Displays customers needing attention with color-coded badges.
    - **Team Performance Summary**: (CEO/Manager-only) shows team sales progress.
    - **Interactive Calendar**: Replaces the To Do List widget, displaying color-coded tasks and interactions with filtering and detail views.
    - **Action Items List**: Filterable list of action items below the calendar.
- **Customer Management**: Comprehensive profiles with multi-contact support, country selection (16 APAC countries including Brunei), notes, marketplace integration, structured retailer types (including Groceries), quarterly soft targets, last contact date, lead management, and interaction tracking. Supports advanced filtering and view toggles. Includes multi-address support with structured fields, CRUD operations, and CSV bulk import for addresses.
- **Excel Import System**: Bulk customer import with downloadable template, flexible column mapping, duplicate detection, currency enforcement, brand assignment, and detailed error tracking.
- **Brand Management**: Many-to-many relationship for multi-brand assignment per customer with inline brand creation (e.g., Beaba, Skip Hop).
- **Target Management**: Supports Personal and General monthly sales targets, with role-based setting capabilities and per-customer monthly targets.
- **Sales Tracking & Reporting**: Monthly sales tracking per customer with budget vs. actuals and variance reporting. Sales now properly sync to `monthly_sales_tracking.actual` using the sale's submitted date (not today's date), ensuring backdated sales are bucketed to the correct month.
- **Sales Form Improvements**: Log New Sale form includes a currency selector (defaults to user's preferred currency) and a customer name combobox with type-ahead search that stores `customerId` on the sale record. The `sales` table now has an optional `customer_id` foreign key column.
- **Last Contact Auto-Update**: Logging a sale for a customer now updates the customer's `lastContactDate` to the sale date if it's more recent than the existing value.
- **Manager Dashboard Visibility**: `/api/targets` and `/api/monthly-sales` now accept an optional `?userId=` query parameter for managers/admins to view team member data. The dashboard `View Team Member` selector passes the selected user's ID to these endpoints so managers see the correct targets and sales.
- **Team Member Dropdown**: Sorted A-Z (with "Myself" pinned at top) in the View Team Member selector on the dashboard.
- **Analytics**: Advanced analytics with monthly and overall views, month selector, team structure visualization, and performance metrics.
- **Admin Dashboard Features**: Four-tab layout with Overview (Regional Leaderboard, User Management with filtering/sorting/bulk selection/inline editing), Assignments (Customer-to-Salesman mapping with filters by salesman, name, and office), Offices (Regional office management), and Comparative Analytics (Region vs Region and Rep vs Rep comparison charts).
- **Pipeline Status Classification**: 4 new stages added to classify stalled leads and prospects without deleting them:
    - **Nurture**: Interested but not ready to convert; revisit when conditions change
    - **Cold**: Unresponsive after multiple follow-ups; no clear disqualification reason
    - **Disqualified – Price Mismatch** (`disqualified_price`): Engaged but couldn't convert due to pricing; revisit with promotions
    - **Disqualified – Unresponsive** (`disqualified_unresponsive`): No response after multiple follow-ups
    - **Disqualification Note**: Optional free-text field (`disqualification_note`) that appears conditionally in the stage selector and customer form when a disqualified stage is chosen
    - **Stage Selector Redesign**: The customer detail modal stage selector is now a grouped pill-button UI (not a linear slider) supporting all 9 stages in 4 groups: Active Pipeline, Qualification, Converted, Inactive
    - **Inline Note Editor**: In the detail modal, clicking the note area opens an in-place textarea for entering/editing the disqualification reason
    - **Grouped Stage Dropdown**: The customer form stage Select and the customers list stage filter both use `SelectGroup` sections for clarity
    - **Pipeline Columns**: 4 new kanban columns added to the pipeline board (Nurture, Cold, Disqualified – Price, Disqualified – Unresponsive)
    - **STAGE_LABELS**: Exported constant mapping stage keys to display names (e.g. `disqualified_price` → "Disqualified – Price Mismatch")
- **Customer Status Management**: Extended customer lifecycle with 9 stages (lead, nurture, cold, disqualified_price, disqualified_unresponsive, prospect, customer, dormant, closed):
    - **Dormant/Closed Tracking**: Customers can be marked as dormant or closed with closure date, reason, and optional notes
    - **Closure Reasons**: Predefined reasons (Out of Business, Competitor, Budget, Poor Fit, Not Responsive, Duplicate, Other)
    - **Soft Delete**: Customers are soft-deleted (hidden from lists but data preserved) with deletedAt timestamp and deletedBy user
    - **Hard Delete**: Admin-only permanent deletion of customer and all related records
    - **Self-Assignment**: Users can assign customers to themselves from the detail modal
    - **Assignment History**: Tracked in customer_assignments table with from/to user and reason
    - **Bulk Operations**: Select multiple customers for bulk status changes or bulk soft-delete
    - **Closure List Import**: Upload Excel file to match and bulk-close customers with preview/confirmation flow
- **Data Retention Policy**: NEVER delete sales data or interaction records. All records must be preserved for historical tracking and audit purposes.
- **Auto Idle Timeout**: Client-side inactivity detection using activity events (mousemove, keydown, click, scroll, touchstart). After 25 minutes idle, a countdown dialog appears with a 5-minute timer. At zero the user is automatically logged out and redirected to the login page. The "Stay Logged In" button resets the timer; "Log Out Now" exits immediately. Only active for authenticated users.
- **AI-Powered Insights (via OpenAI GPT-4o-mini)**:
    - **Customer AI Insights**: In-modal analysis of sales, purchasing, and engagement with actionable recommendations.
    - **User Performance AI Summary**: Comprehensive performance analysis for users (admin/manager access).
    - **AI Next Best Action**: Dashboard widget providing prioritized customer contact recommendations.
    - **Churn Risk Indicator**: In-modal assessment of customer churn risk with risk factors and retention recommendations.
    - **Sales Forecasting**: AI endpoint for predictive analytics.
    - **Interaction Note Summarization**: AI-powered summarization of interaction notes.
    - All AI endpoints enforce role-based authorization.

**System Design Choices:**
- **Frontend**: React 18, TypeScript, Wouter (routing), TanStack Query (data fetching).
- **Backend**: Express.js, TypeScript.
- **Database**: PostgreSQL (Neon), Drizzle ORM.
- **Validation**: Zod (schema validation), react-hook-form.
- **Date Handling**: `date-fns`.

## External Dependencies
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS, Radix UI, react-hook-form, Zod, date-fns, papaparse.
- **Backend**: Express.js, TypeScript, Passport.js, Node.js crypto, Drizzle ORM, connect-pg-simple, Zod, OpenAI SDK.
- **Database**: PostgreSQL (Neon).
- **AI/ML**: OpenAI GPT-4o-mini (via Replit AI Integrations).