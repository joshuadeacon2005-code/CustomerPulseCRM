# Bloom & Grow Group - Sales Management CRM

## Overview
A sales-focused CRM tool for Bloom & Grow Group built with React, Express, and TypeScript. The application features role-based authentication where salesmen can log their sales and admins can view comprehensive statistics separated by salesman. The system uses PostgreSQL for data persistence and includes secure password hashing with session-based authentication.

## Recent Changes
- **October 7, 2025**: Enabled full CRM features and admin access
  - Created admin account: AlexCEO (CEO access)
  - Enabled complete CRM navigation for all users (Customers, Analytics, Segments)
  - Added CRM pages to sidebar navigation for both admins and salesmen
  - Registered all CRM routes in App.tsx with proper authentication protection
  - Admins now have access to all pages including Sales tracking and Admin Dashboard

- **October 6, 2025**: Implemented authentication and sales tracking system
  - Added PostgreSQL database with users and sales tables
  - Implemented authentication system with passport-local and scrypt password hashing
  - Created login/register pages with role selection (admin/salesman)
  - Built sales logging page for salesmen to record transactions
  - Developed admin dashboard showing per-salesman statistics
  - Added role-based routing and protected routes
  - Updated navigation to show appropriate links based on user role
  - Implemented session management with PostgreSQL session store

## Project Architecture

### Frontend (React + TypeScript)
- **Pages**:
  - AuthPage (`/auth`): Login and registration forms with role selection
  - SalesPage (`/sales`): Sales logging form and personal statistics
  - AdminPage (`/admin`): Dashboard showing all salesmen statistics (admin only)
  - CustomersPage (`/customers`): Customer relationship management with lead tracking
  - AnalyticsPage (`/analytics`): CRM analytics and statistics dashboard
  - SegmentsPage (`/segments`): Customer segmentation and targeting
  
- **Key Components**:
  - `AppSidebar`: Role-based navigation sidebar with logout button
  - `ProtectedRoute`: HOC for protecting authenticated routes
  - `AdminRoute`: HOC for protecting admin-only routes
  - `useAuth`: Custom hook for authentication state and actions

### Backend (Express + TypeScript)
- **Authentication** (`auth.ts`):
  - Passport-local strategy with scrypt password hashing
  - Session management with PostgreSQL session store
  - User serialization/deserialization
  - Middleware: `isAuthenticated`, `isAdmin`

- **Storage Interface** (`IStorage`): PostgreSQL database management
  - User operations: getUser, getUserByUsername, createUser
  - Sales operations: getSales, getSalesBySalesman, createSale, getSalesmanStats, getAdminStats
  - Customer operations: create, read, update, delete, list
  - Interaction operations: create, list by customer

- **API Routes**:
  - `POST /api/register` - Create new user account
  - `POST /api/login` - Authenticate user
  - `POST /api/logout` - End user session
  - `GET /api/user` - Get current user (401 if not authenticated)
  - `POST /api/sales` - Create new sale (authenticated)
  - `GET /api/sales` - Get sales (filtered by salesman or all for admin)
  - `GET /api/admin/stats` - Get admin dashboard statistics (admin only)
  - `GET /api/customers` - Get all customers (authenticated)
  - `GET /api/customers/:id` - Get customer with interactions (authenticated)
  - `POST /api/customers` - Create new customer (authenticated)
  - `PATCH /api/customers/:id` - Update customer (authenticated)
  - `DELETE /api/customers/:id` - Delete customer (authenticated)
  - `GET /api/interactions` - Get all interactions (authenticated)
  - `GET /api/interactions/recent` - Get recent interactions (authenticated)
  - `POST /api/interactions` - Create new interaction (authenticated)
  - `GET /api/segments` - Get customer segments (authenticated)
  - `GET /api/stats` - Get CRM statistics (authenticated)

### Data Models
- **User**: id, username, password, name, role, createdAt
- **Sale**: id, salesmanId, customerName, product, amount, description, date
- **Customer**: id, name, email, phone, stage, assignedTo, leadScore, createdAt
- **Interaction**: id, customerId, category, type, description, date
- **SalesmanStats**: salesmanId, salesmanName, totalSales, totalAmount, recentSales
- **AdminDashboardStats**: totalSales, totalRevenue, salesmenStats

## Technology Stack
- **Frontend**: React 18, TypeScript, Wouter (routing), TanStack Query (data fetching)
- **UI**: Shadcn UI, Tailwind CSS, Radix UI primitives
- **Backend**: Express.js, TypeScript, Passport.js (authentication)
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Session Store**: connect-pg-simple (PostgreSQL session storage)
- **Password Hashing**: Node.js crypto (scrypt)
- **Validation**: Zod with react-hook-form
- **Date Handling**: date-fns

## Design System
- **Brand**: Bloom & Grow Group
- **Theme**: Dark mode primary, light mode available via toggle
- **Colors**: Orange primary (18 85% 55%), Teal secondary (175 45% 50%)
- **Typography**: Inter (UI/body)
- **Spacing**: Consistent spacing following design guidelines
- **Components**: Professional with subtle hover states and smooth transitions

## Features Implemented
✅ User authentication (login/register/logout)
✅ Role-based access control (admin/salesman)
✅ Password hashing with scrypt
✅ Session management with PostgreSQL
✅ Sales logging for salesmen
✅ Personal statistics dashboard for salesmen
✅ Admin dashboard with per-salesman statistics
✅ Customer relationship management (add, edit, view customers)
✅ Customer interaction tracking and logging
✅ Analytics dashboard with CRM statistics
✅ Customer segmentation and targeting
✅ Lead scoring system
✅ Protected routes and role-based navigation
✅ PostgreSQL database integration
✅ Dark/light mode theme switching

## Authentication Flow
1. User visits app → redirected to `/auth` if not logged in
2. User can login or register with username/password and role
3. After authentication:
   - Salesmen are redirected to `/sales` to log sales and view their stats
   - Admins are redirected to `/admin` to view all salesmen statistics
4. Navigation sidebar shows appropriate links based on user role
5. Logout button available in sidebar footer

## Database Schema
- **users**: Stores user accounts with hashed passwords and roles
- **sales**: Stores sales transactions linked to salesmen
- **customers**: Stores customer data with stages (lead/prospect/customer), lead scores, and assignments
- **interactions**: Stores customer interactions categorized by marketing/sales/support
- **session**: PostgreSQL session storage (managed by connect-pg-simple)

## User Preferences
- Default theme: Dark mode
- Design approach: Enterprise CRM (inspired by Linear/Notion/HubSpot)
- Information density: High (business productivity tool)
- Primary use case: Sales team customer relationship management
