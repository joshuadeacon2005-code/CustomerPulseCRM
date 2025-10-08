# Bloom & Grow Group - Sales Management CRM

## Overview
A comprehensive sales-focused CRM tool for Bloom & Grow Group, designed to streamline sales processes, manage customer journeys, and provide robust performance analytics. The application supports role-based access, customer data management, brand assignments, monthly target setting, action item tracking, and detailed sales reporting with budget vs. actuals. It aims to enhance sales team efficiency and provide actionable insights for business growth.

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
- **Information Flow**: Role-based navigation and data filtering ensure users only see relevant information (CEO sees all, Regional Manager sees team, Salesman sees own).
- **Dashboard Design**: Analytics and Admin dashboards provide comprehensive overviews with team structure visualization, performance metrics, and role-specific data.

**Technical Implementations & Feature Specifications:**
- **Authentication**: Passport-local strategy with scrypt password hashing and session management using `connect-pg-simple` for PostgreSQL session storage.
- **Role-Based Access Control**: Multi-level roles (CEO, Regional Manager, Salesman) with `managerId` for team hierarchy. Public registration is restricted to the 'salesman' role.
- **Customer Management**: Comprehensive customer profiles including personal notes, BC marketplace integration details, store address, retailer type, quarterly soft targets, and last contact date. Advanced filtering by brand and retailer type. Customer deletion functionality.
- **Brand Management**: Many-to-many relationship allowing multi-brand assignment per customer with inline brand creation.
- **Target Management**: Supports both Personal (individual salespeople) and General (company/team-wide) monthly sales targets, with role-based target setting capabilities.
- **Action Items**: To-do list functionality with status tracking (overdue, today, upcoming), color coding, and visit/call logging.
- **Sales Tracking & Reporting**: Monthly sales tracking per customer with budget vs. actual calculations and variance reporting. Performance reports track sales against targets.
- **Analytics**: Advanced analytics include team structure visualization, team performance metrics (customer counts, targets, action items), and user ID to name mapping for improved readability across charts.
- **Data Storage**: Drizzle ORM for PostgreSQL database interactions, preventing N+1 issues with optimized queries.

**System Design Choices:**
- **Frontend Framework**: React 18 with TypeScript for robust, maintainable UI development. Wouter for routing and TanStack Query for efficient data fetching.
- **Backend Framework**: Express.js with TypeScript for a scalable and secure API layer.
- **Database**: PostgreSQL hosted on Neon for reliable data persistence.
- **Validation**: Zod for schema validation integrated with react-hook-form.
- **Date Handling**: `date-fns` for consistent date operations.

## External Dependencies
- **Frontend**:
    - React 18
    - TypeScript
    - Wouter (routing)
    - TanStack Query (data fetching)
    - Shadcn UI
    - Tailwind CSS
    - Radix UI primitives
    - react-hook-form
    - Zod (for validation)
    - date-fns
- **Backend**:
    - Express.js
    - TypeScript
    - Passport.js (authentication)
    - Node.js crypto (scrypt for password hashing)
    - Drizzle ORM
    - connect-pg-simple (PostgreSQL session storage)
    - Zod (for validation)
- **Database**:
    - PostgreSQL (Neon)