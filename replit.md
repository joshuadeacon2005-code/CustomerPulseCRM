# CRM Tool - Customer Relationship Management

## Overview
A professional, full-featured Customer Relationship Management (CRM) tool built with React, Express, and TypeScript. The application helps businesses track and manage customer interactions, leads, prospects, and customers throughout their journey. Features include customer journey tracking, interaction logging, lead scoring, customer segmentation, and comprehensive analytics.

## Recent Changes
- **October 6, 2025**: Initial implementation of complete CRM system
  - Implemented customer management with CRUD operations
  - Built customer journey tracking (Lead → Prospect → Customer)
  - Created interaction logging system for Marketing, Sales, and Support
  - Developed lead scoring and customer segmentation features
  - Added analytics dashboard with charts and visualizations
  - Implemented dark/light mode with professional enterprise design
  - Used in-memory storage for quick prototyping

## Project Architecture

### Frontend (React + TypeScript)
- **Pages**:
  - Dashboard: Overview stats, pipeline visualization, recent interactions
  - Customers: Customer list with search/filter, add/edit forms, detail modal
  - Segments: Customer segments based on stage, score, and interactions
  - Analytics: Charts and visualizations for customer data analysis
  
- **Key Components**:
  - `AppSidebar`: Navigation sidebar with main menu and quick filters
  - `CustomerCard`: Card displaying customer info with stage badge and score
  - `CustomerDetailModal`: Full customer profile with tabs for overview, interactions, and editing
  - `CustomerForm`: Form for adding/editing customers
  - `InteractionForm`: Form for logging customer interactions
  - `StatCard`: Reusable stat display card for dashboard
  - `ThemeProvider` / `ThemeToggle`: Dark/light mode management

### Backend (Express + TypeScript)
- **Storage Interface** (`IStorage`): In-memory data management
  - Customer operations: create, read, update, delete, list
  - Interaction operations: create, list by customer
  - Segment generation based on customer data
  - Statistics calculation

- **API Routes** (to be implemented in Task 2):
  - `GET /api/customers` - List all customers
  - `GET /api/customers/:id` - Get customer with interactions
  - `POST /api/customers` - Create new customer
  - `PATCH /api/customers/:id` - Update customer
  - `DELETE /api/customers/:id` - Delete customer
  - `POST /api/interactions` - Log new interaction
  - `GET /api/interactions/recent` - Get recent interactions
  - `GET /api/segments` - Get customer segments
  - `GET /api/stats` - Get dashboard statistics

### Data Models
- **Customer**: id, name, email, phone, stage, assignedTo, leadScore, createdAt
- **Interaction**: id, customerId, category, type, description, date
- **Segment**: Auto-generated based on customer criteria
- **DashboardStats**: Aggregated statistics for dashboard

## Technology Stack
- **Frontend**: React 18, TypeScript, Wouter (routing), TanStack Query (data fetching)
- **UI**: Shadcn UI, Tailwind CSS, Radix UI primitives
- **Charts**: Recharts
- **Backend**: Express.js, TypeScript
- **Storage**: In-memory (MemStorage) - can be upgraded to PostgreSQL
- **Validation**: Zod with react-hook-form
- **Date Handling**: date-fns

## Design System
- **Theme**: Dark mode primary, light mode available via toggle
- **Colors**: Professional blue primary, semantic colors for stages (blue=lead, amber=prospect, green=customer)
- **Typography**: Inter (UI/body), JetBrains Mono (code/timestamps)
- **Spacing**: Consistent 4/6/8 unit spacing throughout
- **Components**: Enterprise-grade with subtle hover states and smooth transitions
- **Inspiration**: Linear, Notion, HubSpot CRM

## Features Implemented (Task 1 - Frontend Complete)
✅ Customer journey tracking through stages (Lead → Prospect → Customer)
✅ Customer management (add, edit, view, delete operations)
✅ Interaction logging with categories (Marketing, Sales, Support)
✅ Lead scoring system (0-100 scale)
✅ Customer segmentation based on stage and score
✅ Dashboard with stats and pipeline overview
✅ Analytics page with charts (pie, bar charts for distribution)
✅ Search and filter functionality
✅ Responsive design for mobile and desktop
✅ Dark/light mode theme switching
✅ Professional, enterprise-grade UI following design guidelines

## Next Steps
- Task 2: Implement backend API routes and storage layer
- Task 3: Connect frontend to backend, add error handling, test features

## User Preferences
- Default theme: Dark mode
- Design approach: Enterprise CRM (inspired by Linear/Notion/HubSpot)
- Information density: High (business productivity tool)
- Primary use case: Sales team customer relationship management
