# Overview

Bid is a web-based procurement platform for private tender management. It connects service requesters (clients) with vendors, allowing clients to create tenders, invite qualified vendors, and manage the bidding process. Vendors can submit technical and financial proposals and track their status. The system focuses on private, invitation-based procurement. Key features include a Vendors Base system for managing approved vendor networks, a streamlined vendor joining process, and a guided user onboarding experience with profile completion.

# User Preferences

Preferred communication style: Simple, everyday language.
UI Design Preference: Fast and bold card-based interface design.

# System Architecture

## Frontend Architecture
The client application is built with React and TypeScript, utilizing a component-based architecture. UI components are built with shadcn/ui on top of Radix UI primitives, styled using Tailwind CSS with a custom design system. Wouter is used for routing. State management combines Zustand for authentication and TanStack Query for server state. Forms are handled by react-hook-form with Zod for schema validation. The signup flow guides users through profile completion.

## Backend Architecture
The server is built on Express.js with TypeScript, following a RESTful API design. It features a clean separation of concerns for route handlers, business logic, and data access. Authentication is JWT-based, with bcrypt for password hashing. The architecture includes middleware for logging, error handling, and authentication.

## Data Storage Solutions
PostgreSQL is the primary database, accessed via Drizzle ORM for type-safe operations and migrations. Neon's serverless PostgreSQL service provides scalable cloud-based data storage. Key entities include users (requesters/vendors), tenders, offers, and invitations, all using UUID primary keys.

## Authentication and Authorization
Authentication uses JWT tokens with a role-based access control system for requesters and vendors. Authentication state is persisted with Zustand and localStorage. Bcrypt handles password hashing. The frontend enforces role-based access for routes and components.

## Development and Build Tools
Vite is used for fast development and optimized production builds. TypeScript is configured for strict type checking across the project. Drizzle Kit manages database migrations.

## Core Features
- **Vendors Base System**: Allows requesters to build and manage their approved vendor network. Includes a "Traction Link" for vendors to apply and a "Join Requests Management" panel for requesters to approve/reject applications.
- **Streamlined Vendor Onboarding**: Features a frictionless, one-click join flow for vendors via Traction Links, removing the need for forms. Requires existing vendor accounts and leverages profile data.
- **Guided Signup Flow**: Ensures new users complete their profiles (requester profile or vendor pre-qualification) before accessing dashboards, improving data quality and feature visibility.
- **Proposal Submission**: Enhanced form with autosave, real file uploads to Replit Object Storage with ACL security, progress tracking, inline validation, and real-time deadline countdowns.
- **Requester Profile System**: Comprehensive profile management for requesters (company info, logo, industry) that is required before tender creation. Vendors can view requester profiles.
- **Vendor Pre-Qualification**: Refined form with Saudi-specific compliance requirements, including CR number validation, mandatory document uploads, and a single-select category system.
- **Date Localization**: All date displays are formatted to English locale.

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
- **Zustand**: Lightweight client-side state management.
- **React Hook Form**: Form state management.

## Validation and Forms
- **Zod**: TypeScript-first schema validation.
- **@hookform/resolvers**: Integration for React Hook Form and Zod.
- **Uppy**: File uploader for real file uploads to Replit Object Storage.