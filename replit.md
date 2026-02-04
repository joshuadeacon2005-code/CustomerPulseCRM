# Bloom & Grow Group - Customer Relations Management

## Overview
A comprehensive sales-focused CRM tool for Bloom & Grow Group, designed to streamline sales processes, manage customer journeys, and provide robust performance analytics. It supports role-based access, multi-country customer data management, brand assignments, monthly target setting, and detailed sales reporting with budget vs. actuals. The application aims to enhance sales team efficiency and provide actionable insights for business growth.

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
- **Customer Management**: Comprehensive profiles with multi-contact support, country selection (15 APAC countries), notes, marketplace integration, structured retailer types, quarterly soft targets, last contact date, lead management, and interaction tracking. Supports advanced filtering and view toggles. Includes multi-address support with structured fields, CRUD operations, and CSV bulk import for addresses.
- **Excel Import System**: Bulk customer import with downloadable template, flexible column mapping, duplicate detection, currency enforcement, brand assignment, and detailed error tracking.
- **Brand Management**: Many-to-many relationship for multi-brand assignment per customer with inline brand creation (e.g., Beaba, Skip Hop).
- **Target Management**: Supports Personal and General monthly sales targets, with role-based setting capabilities and per-customer monthly targets.
- **Sales Tracking & Reporting**: Monthly sales tracking per customer with budget vs. actuals and variance reporting.
- **Analytics**: Advanced analytics with monthly and overall views, month selector, team structure visualization, and performance metrics.
- **Admin Dashboard Features**: Four-tab layout with Overview (Regional Leaderboard, User Management with filtering/sorting/bulk selection/inline editing), Assignments (Customer-to-Salesman mapping with filters by salesman, name, and office), Offices (Regional office management), and Comparative Analytics (Region vs Region and Rep vs Rep comparison charts).
- **Data Retention Policy**: NEVER delete sales data or interaction records. All records must be preserved for historical tracking and audit purposes.
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