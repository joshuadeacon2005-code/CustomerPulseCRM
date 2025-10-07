# Bloom & Grow Group - Sales Management CRM

## Overview
A comprehensive sales-focused CRM tool for Bloom & Grow Group built with React, Express, and TypeScript. The application features role-based authentication, customer journey management, brand assignment, monthly sales targets, action item tracking, performance reporting with budget vs actual tracking, and advanced analytics. The system uses PostgreSQL for data persistence and includes secure password hashing with session-based authentication.

## Recent Changes
- **October 7, 2025**: Multi-Level Administrative Management System & Customer Deletion
  - **Multi-Level Role System**:
    - Updated role hierarchy: CEO → Regional Manager → Salesman
    - Added managerId field to users table for team structure
    - Implemented role-based data filtering across all features
    - CEO sees ALL data, Regional Managers see their TEAM's data, Salesmen see only THEIR data
  
  - **Enhanced Monthly Targets**:
    - Added support for both Personal and General targets
    - Personal targets: specific to individual salespeople
    - General targets: company/team-wide goals (salesmanId = null)
    - CEOs and Regional Managers can set both types
    - Salesmen can only set personal targets
  
  - **Security Enhancements**:
    - Public registration restricted to salesman role only
    - CEO and Regional Manager accounts must be created by admins
    - Role-based authentication middleware (isAdmin, isCEO, isManager)
  
  - **Customer Deletion**:
    - Added delete functionality with confirmation dialog
    - Delete button in customer detail modal
    - Removes customer and all associated data
  
  - **Frontend Role Management**:
    - Role-based navigation (different menus for CEO, Regional Manager, Salesman)
    - Manager assignment in admin user creation
    - Personal vs General targets tabs in Monthly Targets page
    - Role-based statistics in Admin Dashboard

- **October 7, 2025**: Comprehensive CRM Enhancement - Added Advanced Features
  - **Backend Extensions**:
    - Added 5 new database tables: brands, customer_brands, monthly_targets, action_items, monthly_sales_tracking
    - Extended customers table with 8 new fields: personalNotes, registeredWithBC, ordersViaBC, firstOrderDate, storeAddress, retailerType, quarterlySoftTarget, lastContactDate
    - Implemented 20+ new storage methods for complete CRM functionality
    - Created 15+ new API routes for brands, targets, tasks, and sales tracking
  
  - **New Pages**:
    - Monthly Targets Page (`/targets`): Salespeople can set their monthly sales targets
    - Action Items Page (`/tasks`): To-do list with status filtering (overdue/today/upcoming) and color coding
    - Sales Reports Page (`/reports`): Monthly sales tracking with budget vs actual and variance calculations
  
  - **Enhanced Components**:
    - CustomerForm: Added all 8 new fields (BC registration toggles, date pickers, store info, retailer type, personal notes)
    - CustomerDetailModal: Rebuilt with 5-tab interface (Overview, Brands, Action Items, Sales Tracking, Interactions)
    - CustomersPage: Advanced filtering with brand multi-select and retailer type filters
    - Brand Management: Multi-brand assignment per customer with inline brand creation
  
  - **Key Features**:
    - Brand assignment system with many-to-many relationships
    - Monthly sales targets per salesperson with target tracking
    - Action items with status-based organization and visit/call logging
    - Monthly sales tracking per customer with budget vs actual variance
    - Enhanced customer data tracking (BC marketplace integration, retailer types, quarterly targets)
    - Optimized backend queries to prevent N+1 issues (brands included in customer fetch)

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
  - CustomersPage (`/customers`): Customer relationship management with advanced filtering (brand, retailer type)
  - AnalyticsPage (`/analytics`): CRM analytics and statistics dashboard
  - SegmentsPage (`/segments`): Customer segmentation and targeting
  - MonthlyTargetsPage (`/targets`): Set and track monthly sales targets per salesperson
  - ActionItemsPage (`/tasks`): To-do list with status-based filtering and color coding
  - SalesReportsPage (`/reports`): Monthly sales tracking with budget vs actual reporting
  
- **Key Components**:
  - `AppSidebar`: Role-based navigation sidebar with logout button
  - `ProtectedRoute`: HOC for protecting authenticated routes
  - `AdminRoute`: HOC for protecting admin-only routes
  - `useAuth`: Custom hook for authentication state and actions
  - `CustomerForm`: Comprehensive form with 8 new fields (BC registration, dates, store info, etc.)
  - `CustomerDetailModal`: 5-tab interface (Overview, Brands, Action Items, Sales Tracking, Interactions)
  - `CustomerCard`: Display card showing customer info with brand badges

### Backend (Express + TypeScript)
- **Authentication** (`auth.ts`):
  - Passport-local strategy with scrypt password hashing
  - Session management with PostgreSQL session store
  - User serialization/deserialization
  - Middleware: `isAuthenticated`, `isAdmin`

- **Storage Interface** (`IStorage`): PostgreSQL database management
  - **User operations**: getUser, getUserByUsername, createUser
  - **Sales operations**: getSales, getSalesBySalesman, createSale, getSalesmanStats, getAdminStats
  - **Customer operations**: create, read, update, delete, list (with brands), getCustomerWithDetails
  - **Interaction operations**: create, list by customer
  - **Brand operations**: createBrand, getBrands, assignBrandToCustomer, removeBrandFromCustomer, getCustomerBrands
  - **Target operations**: setMonthlyTarget, getMonthlyTargets, getMonthlyTarget
  - **Action Item operations**: createActionItem, getActionItems, markActionItemComplete
  - **Sales Tracking operations**: createMonthlySales, getMonthlySales, updateMonthlySalesActual

- **API Routes**:
  - **Auth**: POST /api/register, POST /api/login, POST /api/logout, GET /api/user
  - **Sales**: POST /api/sales, GET /api/sales, GET /api/admin/stats
  - **Customers**: GET /api/customers (with brands), GET /api/customers/:id, POST /api/customers, PATCH /api/customers/:id, DELETE /api/customers/:id
  - **Interactions**: GET /api/interactions, GET /api/interactions/recent, POST /api/interactions
  - **Segments**: GET /api/segments, GET /api/stats
  - **Brands**: GET /api/brands, POST /api/brands, GET /api/customers/:id/brands, POST /api/customers/:id/brands, DELETE /api/customers/:customerId/brands/:brandId
  - **Targets**: GET /api/monthly-targets, POST /api/monthly-targets, GET /api/monthly-targets/:userId/:year/:month
  - **Action Items**: GET /api/action-items, POST /api/action-items, PATCH /api/action-items/:id/complete
  - **Sales Tracking**: GET /api/monthly-sales, POST /api/monthly-sales, PATCH /api/monthly-sales/:id

### Data Models
- **User**: id, username, password, name, role, createdAt
- **Sale**: id, salesmanId, customerName, product, amount, description, date
- **Customer**: id, name, email, phone, stage, assignedTo, leadScore, personalNotes, registeredWithBC, ordersViaBC, firstOrderDate, storeAddress, retailerType, quarterlySoftTarget, lastContactDate, createdAt
- **Interaction**: id, customerId, category, type, description, date
- **Brand**: id, name, description, createdAt
- **CustomerBrand**: customerId, brandId (junction table)
- **MonthlyTarget**: id, userId, month, year, targetAmount, createdAt
- **ActionItem**: id, customerId, description, status, dueDate, visitDate, createdAt
- **MonthlySalesTracking**: id, customerId, month, year, budget, actual, createdAt
- **SalesmanStats**: salesmanId, salesmanName, totalSales, totalAmount, recentSales
- **AdminDashboardStats**: totalSales, totalRevenue, salesmenStats
- **CustomerWithBrands**: Customer + brands[]
- **CustomerWithDetails**: Customer + brands[] + actionItems[] + monthlySales[]

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
✅ **Brand management with multi-brand assignment per customer**
✅ **Monthly sales targets per salesperson**
✅ **Action items/to-do list with status tracking (overdue/today/upcoming)**
✅ **Monthly sales tracking (budget vs actual) with variance calculations**
✅ **Enhanced customer fields (BC registration, retailer type, store address, personal notes, etc.)**
✅ **Advanced filtering (brand multi-select, retailer type)**
✅ **Visit/call logging with action item creation**
✅ **Customer detail modal with 5-tab interface**
✅ **Performance reporting with budget vs actual tracking**
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
- **customers**: Stores customer data with stages (lead/prospect/customer), lead scores, assignments, and 8 enhanced fields
- **interactions**: Stores customer interactions categorized by marketing/sales/support
- **brands**: Stores brand information (name, description)
- **customer_brands**: Junction table for many-to-many customer-brand relationships
- **monthly_targets**: Stores monthly sales targets per salesperson
- **action_items**: Stores action items/tasks with status tracking
- **monthly_sales_tracking**: Stores monthly sales budget and actual per customer
- **session**: PostgreSQL session storage (managed by connect-pg-simple)

## User Preferences
- Default theme: Dark mode
- Design approach: Enterprise CRM (inspired by Linear/Notion/HubSpot)
- Information density: High (business productivity tool)
- Primary use case: Sales team customer relationship management with comprehensive tracking and reporting
