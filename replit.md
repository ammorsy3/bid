# Overview

Bid is a professional procurement platform for the Saudi Arabian market with a **company-centric architecture**. The platform connects companies for private tender management, enabling secure bid submission, multi-stage company qualification, and comprehensive vendor network management. Companies are the primary entities, with users belonging to multiple companies in different roles (Owner, Admin, Member, Viewer). Active company context is stored in JWT tokens and frontend state. Platform admins are global and manage companies across the system.

# User Preferences

Preferred communication style: Simple, everyday language.
UI Design Preference: Fast and bold card-based interface design.

# System Architecture

## Company-Centric Model (November 2025 Refactor)
The platform operates on a company-first architecture where:
- **Companies** are the primary entities (not user roles)
- **Users** can belong to multiple companies with different roles
- Each company has one **active context** stored in JWT (activeCompanyId, roleInCompany)
- Companies can both CREATE tenders (requester behavior) AND SUBMIT proposals (vendor behavior)
- User roles within companies: Owner, Admin, Member, Viewer

## Frontend Architecture
The client application is built with React and TypeScript, utilizing a component-based architecture. UI components are built with shadcn/ui on top of Radix UI primitives, styled using Tailwind CSS with a custom design system. Wouter is used for routing with company-aware guards. State management combines Zustand for authentication (with company context) and TanStack Query for server state. Forms are handled by react-hook-form with Zod for schema validation. The onboarding flow guides users through company creation and profile completion.

## Backend Architecture
The server is built on Express.js with TypeScript, following a RESTful API design with company-scoped routes. Authentication is JWT-based with company context (userId, activeCompanyId, roleInCompany, isAdmin). Bcrypt handles password hashing. The architecture includes two-layer middleware: `authenticateToken` for user verification and `requireCompanyAccess` for company-scoped routes. Admin endpoints use `requireAdmin` middleware for platform-level operations.

## Data Storage Solutions
PostgreSQL is the primary database, accessed via Drizzle ORM for type-safe operations and migrations. Neon's serverless PostgreSQL service provides scalable cloud-based data storage. 

**Key entities:**
- **users**: id, username, email, name, is_admin (global platform admin flag)
- **companies**: id, name, slug, legal_name, cr_number, vat_number, city, category, verification_status, onboarding_state
- **company_profiles**: id, company_id, display_name, bio, logo_url, header_url, is_public, traction_slug
- **user_companies**: user_id, company_id, role_in_company, joined_at (many-to-many junction)
- **tenders**: company-scoped tender management
- **offers**: company proposals to tenders
- **vendors_base**: company-to-company approved vendor relationships
- **join_requests**: vendor companies requesting to join requester bases
- **product_events**: event-first analytics for admin metrics
- **audit_logs**: administrative action tracking with before/after snapshots

All entities use UUID primary keys. Audit logs track all administrative actions with before/after state snapshots for compliance and transparency.

## Authentication and Authorization
Authentication uses JWT tokens with company-centric context:
- **Token payload**: { userId, activeCompanyId, roleInCompany, isAdmin }
- **Role hierarchy within companies**: owner > admin > member > viewer
- **Platform admins**: Global users with is_admin=true, activeCompanyId can be null
- **Company switching**: Regenerates JWT with new activeCompanyId (security over convenience)

Authentication state is persisted with Zustand and localStorage. The frontend enforces company-aware routing and role-gated sections. Backend uses two-layer middleware:
1. `authenticateToken`: Verifies JWT and extracts user/company context
2. `requireCompanyAccess(role)`: Ensures user has required role in active company

## Development and Build Tools
Vite is used for fast development and optimized production builds. TypeScript is configured for strict type checking across the project. Drizzle Kit manages database migrations with `npm run db:push`.

## Core Features

### Company Management
- **Company Creation**: Users create companies with legal info (CR number, VAT, category)
- **Company Verification**: Admin approval flow (under_review → verified/rejected)
- **Multi-Company Support**: Users can belong to multiple companies, switch contexts
- **Profile Completion**: Guided onboarding from draft to completed state
- **Role Management**: Owner/Admin/Member/Viewer hierarchy within companies

### Unified Dashboard
- **Role-Gated Tabs**: Overview, Tenders (admin+), Proposals, Vendors Base (admin+)
- **Company Context**: All actions scoped to active company
- **Verification Banner**: Visual feedback for pending verification
- **Quick Actions**: Create tenders, manage profile, view proposals

### Vendors Base System
Allows companies to build and manage their approved vendor network. Includes a "Traction Link" for vendors to apply and a "Join Requests Management" panel for admins to approve/reject applications. Company-to-company relationships tracked in vendors_base table.

### Tender Attachments
Requesters can upload supporting documents (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG) directly in the form builder via the Attachments card. Files are uploaded to Replit Object Storage via presigned URLs and stored in the `attachments` jsonb column on the tenders table. Attachments appear in the Project Scope section of the published RFP as downloadable file cards with type-based icons and file sizes.

### Proposal Submission
Enhanced form with autosave, real file uploads to Replit Object Storage with ACL security, progress tracking, inline validation, and real-time deadline countdowns.

### Platform Admin Dashboard
Comprehensive administrative control panel with operational capabilities:
- **Company Verification**: Approve/reject pending company registrations
- **Join Request Management**: Monitor company-to-company relationships
- **Award Unblocking**: Manage blocked awards
- **User Promotion**: Grant platform admin access
- **Audit Logging**: Complete audit trail with before/after snapshots
- **Event-First Analytics**: Real-time metric calculations from database aggregations

### Error Logging System
Centralized error logging captures both client-side and server-side errors into the `error_logs` database table.
- **Client errors**: Unhandled JS exceptions, unhandled promise rejections, and failed API responses are automatically reported via `POST /api/errors`
- **Server errors**: Express global error handler middleware logs unhandled server errors
- **Admin access**: Platform admins can view all error logs via `GET /api/admin/errors`
- **Data captured**: userId, companyId, source (client/server), HTTP method, path, status code, error message, stack trace, user agent, metadata
- **Frontend utility**: `client/src/lib/errorLogger.ts` — `reportError()` function and `setupGlobalErrorHandlers()` for window-level error capture

### Date Localization
All date displays are formatted to English locale.

# Recent Changes (November 2025)

## Major Architectural Refactor: Role-Based → Company-Centric

**Completed:**
1. ✅ Database schema completely rewritten (clean break, no backwards compatibility)
2. ✅ Backend: Storage layer and routes updated for company context
3. ✅ Frontend: Auth store, routing, Dashboard, CompanyOnboarding pages
4. ✅ Admin pages: Updated for company verification (AdminVendors)
5. ✅ Bug fixes: CompanyOnboarding profile completion flow
6. ✅ Full e2e testing: Playwright validation successful

**Migration Notes:**
- All existing data was cleared (clean break)
- Users now create companies instead of having roles
- Companies are verified by platform admins
- JWT tokens include activeCompanyId for company-scoped operations

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL.

## UI and Styling Libraries
- **Radix UI**: Unstyled, accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Authentication and Security
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT implementation.

## Development and Build Tools
- **Vite**: Fast build tool.
- **TypeScript**: Static type checking.
- **Replit**: Development environment.

## State Management and HTTP Client
- **TanStack Query**: Server state management.
- **Zustand**: Lightweight client-side state management (auth with company context).
- **React Hook Form**: Form state management.

## Validation and Forms
- **Zod**: TypeScript-first schema validation.
- **@hookform/resolvers**: Integration for React Hook Form and Zod.
- **Uppy**: File uploader for real file uploads to Replit Object Storage.
