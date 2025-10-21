# Bloom & Grow Group - Sales Management CRM

## Overview
A comprehensive sales-focused CRM tool for Bloom & Grow Group, designed to streamline sales processes, manage customer journeys, and provide robust performance analytics. The application supports role-based access, multi-country customer data management, brand assignments, monthly target setting, to-do list management, and detailed sales reporting with budget vs. actuals. It aims to enhance sales team efficiency and provide actionable insights for business growth.

## Recent Changes (October 2025)
- **Multi-Country Support**: Added country field to users, customers, sales, and interactions for international operations
- **Enhanced Customer Profiles**: Main contact fields (name, title, phone, email) plus support for additional contacts per customer
- **Structured Retailer Types**: Replaced free-text with 14 specific categories (Online Only, Marketplace, Baby & Nursery, Toy Stores, Department Stores, etc.)
- **Lead Management**: Added dateOfFirstContact and leadGeneratedBy fields for better lead tracking
- **Interaction Enhancements**: Added attendees field and meetingType enum for detailed interaction tracking
- **Basecamp Integration**: OAuth 2.0 integration allowing users to sync incomplete todos from selected Basecamp projects with duplicate prevention via stored todo IDs

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
- **Role-Based Access Control**: Multi-level roles (CEO, Manager, Salesman) with `managerId` for team hierarchy. Public registration is restricted to the 'salesman' role.
- **Customer Management**: Comprehensive customer profiles with country tracking, main contact information (name, title, phone, email), support for additional contacts, personal notes, BC marketplace integration details, store address, structured retailer type selection (14 categories), quarterly soft targets, last contact date, lead management (date of first contact, lead source), and interaction tracking. Advanced filtering by brand and retailer type. Customer deletion functionality.
- **Brand Management**: Many-to-many relationship allowing multi-brand assignment per customer with inline brand creation.
- **Target Management**: Supports both Personal (individual salespeople) and General (company/team-wide) monthly sales targets, with role-based target setting capabilities.
- **To Do List**: Task management functionality with status tracking (overdue, today, upcoming), color coding, visit/call logging, and integrated Basecamp sync.
- **Basecamp Integration**: OAuth 2.0 integration embedded within the To Do List page allowing users to connect their Basecamp accounts and sync todos. Features include:
  - **One-Way Sync**: Basecamp → CRM only (import todos, no changes back to Basecamp)
  - **User-Selected Projects**: Choose which Basecamp projects to sync from
  - **Manual Sync**: User-triggered sync via "Import from Basecamp" button
  - **Duplicate Prevention**: Stores Basecamp todo IDs to prevent re-importing
  - **Incomplete Todos Only**: Syncs only uncompleted todos from Basecamp
  - **Customer Assignment**: Manual selection of which customer to assign synced todos to
  - **Secure OAuth**: Uses cryptographically secure random tokens (32-byte hex) for CSRF protection with 10-minute expiry and one-time use validation
  - **Token Management**: Stores access tokens with expiration tracking
- **Sales Tracking & Reporting**: Monthly sales tracking per customer with budget vs. actual calculations and variance reporting. Performance reports track sales against targets.
- **Analytics**: Advanced analytics with **monthly and overall views** plus **month selector** to view previous months. Monthly view includes a dropdown to select any of the last 12 months for historical analysis. Overall analytics display all-time data. Features include team structure visualization, team performance metrics (customer counts, targets, to-dos), and user ID to name mapping for improved readability across charts.
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