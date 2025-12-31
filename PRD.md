# Product Requirements Document (PRD)
## Bloom & Grow Group - Customer Relations Management System

**Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Production Ready

---

## 1. Executive Summary

### 1.1 Product Overview
The Bloom & Grow Group CRM is a comprehensive sales-focused customer relationship management platform designed to streamline sales processes, manage customer journeys, and provide robust performance analytics for a multi-regional sales organization.

### 1.2 Business Objectives
- Centralize customer data management across multiple regional offices
- Enable sales team efficiency through streamlined workflows
- Provide actionable insights through AI-powered analytics
- Support hierarchical role-based access for data security
- Track sales performance against targets with budget vs. actuals reporting

### 1.3 Target Users
- **CEO/Executives**: Full system oversight and strategic planning
- **Sales Directors**: Team management and performance monitoring
- **Regional Managers**: Regional operations and team coordination
- **Managers**: Direct team supervision and customer assignment
- **Salesmen**: Daily customer interaction and sales logging

---

## 2. Core Features

### 2.1 Authentication & Access Control

#### 2.1.1 User Authentication
- Secure login/registration with password hashing (scrypt)
- Session-based authentication with persistent sessions
- Public registration restricted to 'salesman' role only

#### 2.1.2 Role-Based Access Control (RBAC)
| Role | Access Level | Capabilities |
|------|--------------|--------------|
| CEO | Full System | Create/edit/delete users, manage offices, view all data, set targets |
| Sales Director | Admin | Create/edit users, view all sales data, manage team members |
| Marketing Director | Admin | Create/edit users, view all data, manage marketing initiatives |
| Regional Manager | Admin | Create/edit users, manage offices, oversee regional teams |
| Manager | Admin | Create/edit assigned users, view team data |
| Salesman | Basic | View/edit own customers and data only |

#### 2.1.3 Team Hierarchy
- Manager-to-salesman assignment via `managerId` relationship
- Cascading data visibility based on team structure
- Office-based data filtering

---

### 2.2 Customer Management

#### 2.2.1 Customer Profiles
- **Core Fields**: Company name, contact details, country (15 APAC countries)
- **Multi-Contact Support**: Multiple contacts per customer with roles
- **Multi-Address Support**: Structured address fields with CRUD operations
- **Classification**: Stage (Lead, Prospect, Customer, Churned), retailer types
- **Brand Assignment**: Many-to-many relationship for multi-brand customers

#### 2.2.2 Customer Lifecycle
- Lead management with conversion tracking
- Pipeline stage progression (Lead → Prospect → Customer)
- Last contact date tracking
- Quarterly soft targets per customer
- Churn risk assessment

#### 2.2.3 Bulk Operations
- Excel/CSV import with downloadable template
- Flexible column mapping
- Duplicate detection
- Currency enforcement during import
- Detailed error tracking and reporting

---

### 2.3 Sales Pipeline

#### 2.3.1 Visual Pipeline
- Drag-and-drop customer movement between stages
- Stage-based value calculations
- Conversion rate metrics (Lead → Prospect, Prospect → Customer)

#### 2.3.2 Pipeline Analytics
- Total pipeline value
- Stage distribution visualization
- Conversion funnel analysis

---

### 2.4 Interaction Tracking

#### 2.4.1 Interaction Types
- Calls, Emails, Meetings, Notes
- Date and time logging
- Detailed notes with AI summarization

#### 2.4.2 Follow-up Management
- Follow-up date scheduling
- Overdue interaction alerts
- Action item creation from interactions

---

### 2.5 Sales Tracking & Targets

#### 2.5.1 Target Management
- **Personal Targets**: Individual salesman goals
- **General Targets**: Team/company-wide objectives
- Monthly target setting with year overview
- Per-customer monthly targets

#### 2.5.2 Sales Recording
- Monthly sales per customer
- Budget vs. actuals tracking
- Variance reporting and analysis

#### 2.5.3 Currency System
- User-selectable preferred currency (USD, HKD, SGD, CNY, AUD, IDR, MYR)
- 49 pre-seeded exchange rate pairs
- Dual storage: original currency + base currency (USD)
- Real-time conversion display

---

### 2.6 Regional Office Management

#### 2.6.1 Office Structure
Pre-seeded offices:
- Hong Kong
- Singapore
- Shanghai
- Australia/New Zealand
- Indonesia
- Malaysia
- Guangzhou

#### 2.6.2 Office Assignments
- **Salesman**: Single-office restriction (one office only)
- **Manager**: Multi-office access for regional oversight
- Three role types: salesman, manager, viewer

#### 2.6.3 Data Visibility
- Office-based customer filtering
- Regional performance comparisons
- Cross-office analytics for executives

---

### 2.7 Analytics & Reporting

#### 2.7.1 Dashboard Analytics
- KPI cards with month-over-month trends
- At-risk customers widget
- Team performance summary (managers/CEO)
- Interactive calendar with tasks and interactions

#### 2.7.2 Advanced Analytics
- Monthly and overall sales views
- Team structure visualization
- Regional leaderboards
- Rep vs. Rep comparisons
- Region vs. Region comparisons

#### 2.7.3 Report Generation
- Sales reports with customizable date ranges
- Excel export functionality
- Performance summaries

---

### 2.8 AI-Powered Features

#### 2.8.1 Customer Insights
- Sales pattern analysis
- Purchasing behavior assessment
- Engagement scoring
- Actionable recommendations

#### 2.8.2 Churn Risk Analysis
- Risk factor identification
- Churn probability scoring
- Retention recommendations

#### 2.8.3 Performance Analytics
- User performance summaries (admin/manager access)
- Next best action recommendations
- Sales forecasting

#### 2.8.4 Note Summarization
- AI-powered interaction note summarization
- Key point extraction

---

### 2.9 Admin Dashboard

#### 2.9.1 Overview Tab
- Regional leaderboard
- User management with filtering, sorting, bulk selection
- Inline user editing

#### 2.9.2 Assignments Tab
- Customer-to-salesman mapping
- Filter by salesman, name, office

#### 2.9.3 Offices Tab
- Regional office management
- User assignment interface
- Office performance overview

#### 2.9.4 Comparative Analytics Tab
- Region vs. Region charts
- Rep vs. Rep comparisons
- Performance benchmarking

---

## 3. Technical Specifications

### 3.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Wouter, TanStack Query |
| UI Components | Shadcn UI, Tailwind CSS, Radix UI |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle ORM |
| Validation | Zod, react-hook-form |
| AI/ML | OpenAI GPT-4o-mini |
| Date Handling | date-fns |
| Data Import | PapaParse, XLSX |

### 3.2 Design System

#### 3.2.1 Theme
- Primary: Orange color scheme
- Secondary: Teal accent
- Typography: Inter font family
- Mode: Light mode primary, dark mode available

#### 3.2.2 UI Patterns
- Gradient card styling with hover elevations
- Consistent spacing (p-6, gap-4/6, space-y-6)
- Icon-enhanced card titles
- Role-based navigation filtering

---

## 4. Data Model

### 4.1 Core Entities

```
Users
├── id (UUID)
├── name
├── username
├── password (hashed)
├── role
├── managerId (FK → Users)
├── regionalOffice
└── preferredCurrency

Customers
├── id
├── companyName
├── stage (lead/prospect/customer/churned)
├── country
├── assignedUserId (FK → Users)
├── officeId (FK → Offices)
└── brands (many-to-many)

Interactions
├── id
├── customerId (FK → Customers)
├── userId (FK → Users)
├── type
├── date
├── notes
└── followUpDate

MonthlySales
├── id
├── customerId (FK → Customers)
├── month/year
├── budget
├── actual
├── currency
└── baseCurrencyAmount

MonthlyTargets
├── id
├── userId (FK → Users)
├── month/year
├── targetAmount
└── targetType (personal/general)

Offices
├── id
├── name
└── region

OfficeAssignments
├── userId (FK → Users)
├── officeId (FK → Offices)
└── roleType
```

---

## 5. Security Requirements

### 5.1 Authentication
- Password hashing with scrypt
- Session-based authentication
- Automatic session expiration

### 5.2 Authorization
- Endpoint-level role verification
- Data-level access control
- Case-insensitive role comparisons

### 5.3 Data Protection
- Server-side validation for all inputs
- Currency consistency enforcement
- Audit trail for critical operations

---

## 6. Performance Requirements

### 6.1 Response Times
- Page load: < 2 seconds
- API responses: < 500ms
- Real-time currency conversion: < 100ms

### 6.2 Scalability
- Support for 1000+ customers per organization
- Efficient pagination for large datasets
- Optimized query patterns for analytics

---

## 7. Future Considerations

### 7.1 Potential Enhancements
- Mobile application
- Email integration
- Calendar sync (Google, Outlook)
- Advanced reporting with custom dashboards
- Workflow automation
- API integrations with external systems

### 7.2 Scalability Roadmap
- Multi-tenant architecture
- Advanced caching strategies
- Microservices decomposition

---

## 8. Success Metrics

### 8.1 Adoption Metrics
- Daily active users
- Feature utilization rates
- User session duration

### 8.2 Business Metrics
- Sales conversion rate improvement
- Customer retention rate
- Time-to-close reduction
- Target achievement percentage

### 8.3 Operational Metrics
- System uptime (target: 99.9%)
- Average response time
- Error rate
