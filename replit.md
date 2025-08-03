# Overview

Bid is a web-based procurement platform that facilitates private tender management between service requesters (clients) and vendors. The platform enables requesters to create tenders with specific requirements and deadlines, invite qualified vendors, and manage the bidding process. Vendors can view invitations, submit technical and financial proposals, and track their submission status. The system emphasizes private, invitation-based procurement rather than public tendering.

# User Preferences

Preferred communication style: Simple, everyday language.

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