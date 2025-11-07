# Bloom & Grow Group - Sales Management CRM

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

**Technical Implementations & Feature Specifications:**
- **Authentication**: Passport-local strategy with scrypt password hashing and session management.
- **Role-Based Access Control**: Multi-level roles (CEO, Sales Director, Regional Manager, Manager, Salesman) with `managerId` for team hierarchy. Public registration is restricted to 'salesman'. Authorization middleware provides backward compatibility for legacy "admin" role. CEO and admin roles have identical permissions across all features for viewing team member data.
- **Regional Office Management**: Users can be assigned to regional offices (Hong Kong, Singapore, Shanghai, Australia/NZ, Indonesia, Malaysia, Guangzhou).
- **Homepage Dashboard**: Role-based dashboard (`/dashboard`) with quick actions, five performance metrics (Target, Sales to Date, Progress, Monthly Interactions, New Customers), interactive calendar view, filterable action items list, team member selector for managers/CEOs, and regional office display. Calendar positioned between Quick Actions and Performance sections for optimal UX flow.
- **Customer Management**: Comprehensive profiles with country tracking, main and additional contacts, notes, BC marketplace integration, store address, structured retailer type selection (14 categories), quarterly soft targets, last contact date, lead management (date of first contact, lead source), and interaction tracking. Advanced filtering by brand and retailer type. Includes downloadable Excel template for bulk customer imports with pre-formatted columns and example data.
- **Brand Management**: Many-to-many relationship for multi-brand assignment per customer with inline brand creation.
- **Target Management**: Supports Personal and General monthly sales targets, with role-based setting capabilities, integrated into the Sales Dashboard.
- **Customer Monthly Targets**: Per-customer monthly sales targets with full CRUD operations in dedicated Targets tab within customer detail modal. Features optimistic UI updates for instant responsiveness, security-enhanced ownership validation preventing cross-customer data tampering, and chronological sorting (newest first). Uses shared edit dialog pattern to avoid click handler conflicts.
- **To Do List**: Task management with status tracking, color coding, visit/call logging, and CSV bulk import.
- **CSV Todo Import**: Flexible CSV import for bulk uploading todos with server-side validation, field mapping, date validation, customer assignment, and error handling.
- **Sales Tracking & Reporting**: Monthly sales tracking per customer with budget vs. actuals and variance reporting. Performance reports track sales against targets. Product Name field removed; products now default to "General Sale".
- **Analytics**: Advanced analytics with monthly and overall views, month selector for historical analysis, team structure visualization, team performance metrics, and user ID to name mapping.
- **Admin User Management**: Filtering, sorting, bulk selection, and inline editing with password hashing. Role-based manager assignment with automatic managerId clearing for non-salesman roles. Case-insensitive role checks for backward compatibility.
- **Lead Source Tracking**: Structured dropdown for lead sources (Referral, Cold Call, BC, Others with conditional text field).
- **Calendar View on Dashboard**: Interactive calendar (using react-big-calendar) replacing the To Do List widget, displaying both action items and customer interactions. Features color-coded events (overdue/today/upcoming/completed tasks, interactions), multiple view modes (month/week/day/agenda), proper timezone handling with parseISO and startOfDay, filtering by user's assigned customers, and clickable events that open a dialog showing full action item or interaction details with ability to mark items complete/incomplete.
- **Action Items Management**: Comprehensive filterable action items list below the calendar with filters for customer (dropdown) and status (All/Pending/Completed/Overdue). Displays up to 10 items with color-coded status badges, overdue indicators, and quick completion toggle. Shows customer name, due date, and status for each item.
- **Enhanced Dashboard Metrics**: Five performance cards showing Target, Sales to Date, Progress percentage with visual progress bar, Monthly Interactions count (number of customer interactions this month), and New Customers count (customers added this month based on first contact date). All metrics are role-based and filter according to user's assigned customers or team hierarchy.

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
- **Database**:
    - PostgreSQL (Neon)