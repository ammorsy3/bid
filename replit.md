# Overview

Bid is a web-based procurement platform that facilitates private tender management between service requesters (clients) and vendors. The platform enables requesters to create tenders with specific requirements and deadlines, invite qualified vendors, and manage the bidding process. Vendors can view invitations, submit technical and financial proposals, and track their submission status. The system emphasizes private, invitation-based procurement rather than public tendering.

# Recent Changes

## October 16, 2025 - Requester Profile System & Validation Fixes
Implemented complete requester profile management and refined vendor validation:
- **Requester Profile System**: Created comprehensive profile management for requesters with company information, bio, logo upload, industry selection, and contact details
- **Profile Requirement**: Requesters must complete their profile before creating tenders - enforced at both frontend and backend with automatic redirect to profile page
- **CR Number Input**: Fixed vendor pre-qualification to prevent typing non-numeric characters in CR number field (real-time input filtering)
- **Bio Character Validation**: Changed bio validation from 5-100 words to 5-100 characters across schema, backend, and frontend with character counter
- **Dashboard Status Sync**: Fixed vendor dashboard to properly refresh authentication state after pre-qualification submission, correctly showing "under review" status
- **Vendor Proposal Access**: Vendors can now submit proposals immediately after pre-qualification (while under_review status), removing waiting period
- **Profile Management UI**: Added "Manage Profile" button to requester dashboard header for easy profile access; vendors already have "Update Profile" in their dashboard
- **Database Schema**: Added requester_profiles table with companyName, bio, logoUrl, industry, companySize, websiteUrl, linkedinUrl, and contact information fields

## October 16, 2025 - Pre-Qualification Form Refinements
Refined vendor pre-qualification form with Saudi-specific compliance requirements:
- **CR Number Validation**: Commercial Registration number now requires numeric-only input (regex validation)
- **Required Documents**: GOSI certificate, logo, and company profile are now mandatory fields
- **National Address Certificate**: Changed from text fields (city/street/postal) to file upload for official certificate
- **Category System**: Replaced free-text multi-input with single-select dropdown featuring 15 predefined categories (IT & Software, Construction, Healthcare, Finance, Legal Services, etc.)
- **Bio Validation**: Enhanced with 5-100 word count requirement and real-time word counter display
- **Simplified Header Upload**: Removed "or color" option, now only supports header image upload
- **Label Updates**: Renamed "Profile File" to "Company Profile" for clarity
- **Database Schema**: Updated vendor_qualifications table to reflect single category selection, removed headerColor field, replaced national address text fields with nationalAddressCertificateUrl

## September 30, 2025 - Enhanced Proposal Submission Form
The vendor proposal submission form now features a comprehensive smart form experience:
- **Autosave with Draft Recovery**: Automatically saves form progress every 3 seconds to localStorage, with a draft recovery prompt when reopening
- **Real File Uploads**: Integrated Replit Object Storage with Uppy for technical and financial proposal uploads (PDF, DOC, XLS up to 10MB)
- **ACL Security**: File uploads are protected with ACL metadata, ensuring only authorized users can access uploaded proposals
- **Progress Tracking**: Visual progress indicator showing completion status of required fields
- **Inline Validation**: Real-time validation feedback with SmartTextarea components showing green checks for valid inputs
- **Keyboard Shortcuts**: Ctrl+Enter to submit, Escape to close modal for power users
- **Deadline Countdown**: Real-time countdown timer updating every minute with urgency indicator (red for <24 hours)
- **Budget Alerts**: Displays tender budget information to help vendors price competitively
- **Submission Summary**: Clear overview of tender details, client info, and deadline before submission

# User Preferences

Preferred communication style: Simple, everyday language.
UI Design Preference: Fast and bold card-based interface design.

# System Architecture

## Frontend Architecture
The client application is built using React with TypeScript, utilizing a modern component-based architecture. The UI is implemented with shadcn/ui components built on top of Radix UI primitives, providing accessible and customizable interface elements. Styling is handled through Tailwind CSS with a comprehensive design system including custom color variables for primary, secondary, success, warning, and error states.

The application uses Wouter for client-side routing, providing a lightweight alternative to React Router. State management follows a hybrid approach with Zustand for authentication state and TanStack Query for server state management and caching. The form handling is managed through react-hook-form with Zod schema validation for type-safe form processing.

## Backend Architecture
The server is built on Express.js with TypeScript, following a RESTful API design pattern. The application implements a clean separation between route handlers, business logic, and data access layers. Authentication is JWT-based with bcrypt for password hashing, providing secure session management.

The server architecture includes middleware for request logging, error handling, and authentication verification. The storage layer is abstracted through an interface pattern, allowing for flexible data access implementations while maintaining type safety through the shared schema definitions.

## Data Storage Solutions
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations and migrations. The database connection is established through Neon's serverless PostgreSQL service, providing scalable cloud-based data storage.

The database schema includes four main entities: users (supporting both requester and vendor roles), tenders (procurement opportunities), offers (vendor submissions), and invitations (private tender invitations). All tables use UUID primary keys for security and scalability, with proper foreign key relationships maintaining data integrity.

## Authentication and Authorization
Authentication is implemented using JWT tokens with a role-based access control system. Users can register as either requesters or vendors, with different permissions and interface experiences based on their role. The authentication state is persisted using Zustand with localStorage persistence, maintaining user sessions across browser reloads.

Password security is handled through bcrypt hashing with salt rounds, and JWT tokens include user ID and role information for authorization decisions. The frontend includes protected routes and role-based component rendering to ensure users only access appropriate functionality.

## Development and Build Tools
The project uses Vite as the build tool for fast development and optimized production builds. The development setup includes hot module replacement and runtime error overlays for improved developer experience. TypeScript configuration covers both client and server code with strict type checking enabled.

The build process separates client and server bundles, with the client assets served statically in production. Database migrations are managed through Drizzle Kit, providing version-controlled schema changes and deployment automation.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling and automatic scaling
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL with migration management

## UI and Styling Libraries
- **Radix UI**: Unstyled, accessible UI primitives for complex components like dialogs, dropdowns, and form controls
- **Tailwind CSS**: Utility-first CSS framework with custom design system configuration
- **Lucide React**: Icon library providing consistent SVG icons throughout the interface

## Authentication and Security
- **bcrypt**: Password hashing library for secure credential storage
- **jsonwebtoken**: JWT implementation for stateless authentication tokens

## Development and Build Tools
- **Vite**: Fast build tool with hot module replacement and optimized production builds
- **TypeScript**: Static type checking for both client and server code
- **Replit**: Development environment with integrated tooling and deployment capabilities

## State Management and HTTP Client
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **Zustand**: Lightweight state management for client-side application state
- **React Hook Form**: Form state management with validation integration

## Validation and Forms
- **Zod**: TypeScript-first schema validation for forms and API inputs
- **@hookform/resolvers**: Integration layer between React Hook Form and Zod validation schemas