# Overview

Bid is a web-based procurement platform that facilitates private tender management between service requesters (clients) and vendors. The platform enables requesters to create tenders with specific requirements and deadlines, invite qualified vendors, and manage the bidding process. Vendors can view invitations, submit technical and financial proposals, and track their submission status. The system emphasizes private, invitation-based procurement rather than public tendering.

# Recent Changes

## October 24, 2025 - Unified Join Request System
Refactored join request flow to eliminate data duplication and enforce vendor account requirement:
- **Schema Simplification**: join_requests table now only stores references (vendorId, requesterId, status, rejectionReason) instead of duplicating vendor data
- **Vendor Account Requirement**: All join requests now require an existing vendor account - vendorId is mandatory (non-nullable)
- **Authentication Required**: /api/r/:slug/apply endpoint now requires vendor authentication before submission
- **Deduplication Logic**: Prevents duplicate join requests to the same requester within 24 hours
- **Profile-Based Display**: VendorsBase page now shows vendor information from vendor profile data instead of duplicate join request fields
- **Single Source of Truth**: All vendor data (company name, email, expertise, verification status) comes from users and vendor_qualifications tables
- **Data Migration**: Removed legacy join requests with null vendorId during migration
- **Important Change**: Vendors must now have accounts before applying through traction links (future enhancement: onboarding flow for new vendors)

## October 24, 2025 - Improved Signup Flow & Profile Completion
Implemented guided signup journey ensuring users complete their profiles before accessing the dashboard:
- **Registration Redirect**: New users are now redirected to profile/pre-qualification pages instead of dashboard immediately after signup
- **Requester Journey**: Register → Profile Creation → Dashboard (with Traction Link visible)
- **Vendor Journey**: Register → Pre-Qualification → Dashboard (with verification status)
- **Dashboard Profile Check**: Both dashboards now check profile completion on load and redirect if incomplete
- **Welcome Messages**: Clear success messages guide users through the profile completion process
- **No Circular Redirects**: Proper error state checking prevents redirect loops after profile completion
- **Traction Link Visibility**: Requesters see their traction link only after completing their profile, solving the issue where new requesters couldn't find the Vendors Base features

## October 23, 2025 - Vendors Base System Implementation
Implemented complete Vendors Base feature allowing requesters to build and manage their approved vendor network:
- **Traction Link**: Auto-generated public link (/r/{slug}) where vendors can apply to join requester's base without prior registration
- **Join Requests Management**: Review panel for requesters to approve/reject vendor applications with detailed company information
- **Dual Entry Paths**: Vendors can join through Traction Link (public application) or Invitation Link (direct invite tied to tender deadlines)
- **Vendors Base Page**: Complete vendor management interface with search functionality, vendor profiles, and join request history
- **Dashboard Integration**: Added "Invite Your Vendors!" section to requester dashboard showing traction link with copy/share functionality and pending request count
- **Database Schema**: Added 4 new tables (vendors_base, join_requests, invitation_links, analytics_events) with proper relations and event logging
- **Important Behavior**: Join requests from non-registered vendors are approved but vendor only added to base after they create an account with the approved email
- **Navigation**: Added "Vendors" link to requester navbar leading to /vendors-base for easy access to vendor management

## October 23, 2025 - Date Localization & Profile Viewing Enhancements
Improved user experience with proper date formatting and requester profile access for vendors:
- **Date Format Fix**: Changed all deadline and date displays from Hijri calendar format to English locale (dates now show as "Oct 23, 2025" instead of "Jmd.1 1447 ah")
- **Requester Profile Viewing**: Vendors can now view requester profiles from tender detail pages via "View Client Profile" button, showing company information, contact details, and social links
- **Under Review Offer Submission**: Enhanced vendor experience by allowing immediate offer submission after pre-qualification submission (while status is "under_review"), displaying success message: "You can submit offers now while we verify your information"
- **API Enhancement**: Added public requester profile endpoint (`/api/requester/profile/:requesterId`) accessible to all authenticated users
- **UI Components**: Created RequesterProfileView component with compact and full display modes for requester company profiles

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