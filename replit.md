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
- **Role-Based Access Control**: Multi-level roles (CEO, Sales Director, Regional Manager, Manager, Salesman) with `managerId` for team hierarchy. Public registration is restricted to 'salesman'. Authorization middleware provides backward compatibility for legacy "admin" role.
- **Regional Office Management**: Users can be assigned to regional offices (Hong Kong, Singapore, Shanghai, Australia/NZ, Indonesia, Malaysia, Guangzhou).
- **Homepage Dashboard**: Role-based dashboard (`/dashboard`) with quick actions, current month performance metrics (target vs. sales), leads overview, to-do list widget, team member selector for managers/CEOs, and regional office display.
- **Customer Management**: Comprehensive profiles with country tracking, main and additional contacts, notes, BC marketplace integration, store address, structured retailer type selection (14 categories), quarterly soft targets, last contact date, lead management (date of first contact, lead source), and interaction tracking. Advanced filtering by brand and retailer type. Includes downloadable Excel template for bulk customer imports with pre-formatted columns and example data.
- **Brand Management**: Many-to-many relationship for multi-brand assignment per customer with inline brand creation.
- **Target Management**: Supports Personal and General monthly sales targets, with role-based setting capabilities, integrated into the Sales Dashboard.
- **To Do List**: Task management with status tracking, color coding, visit/call logging, and CSV bulk import.
- **CSV Todo Import**: Flexible CSV import for bulk uploading todos with server-side validation, field mapping, date validation, customer assignment, and error handling.
- **Sales Tracking & Reporting**: Monthly sales tracking per customer with budget vs. actuals and variance reporting. Performance reports track sales against targets. Product Name field removed; products now default to "General Sale".
- **Analytics**: Advanced analytics with monthly and overall views, month selector for historical analysis, team structure visualization, team performance metrics, and user ID to name mapping.
- **Admin User Management**: Filtering, sorting, bulk selection, and inline editing with password hashing. Role-based manager assignment with automatic managerId clearing for non-salesman roles. Case-insensitive role checks for backward compatibility.
- **Lead Source Tracking**: Structured dropdown for lead sources (Referral, Cold Call, BC, Others with conditional text field).

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