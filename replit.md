# TimesheetPro - Smart Timesheet Tracking

## Overview

TimesheetPro is a web application designed to help users track and manage timesheet entries through screenshot uploads with OCR (Optical Character Recognition) processing. The application automatically extracts timesheet data from uploaded images, calculates weekly hours, and tracks "lieu time" (overtime hours beyond the standard 40-hour work week). Users can view their time entries, generate reports with visualizations, and export data in multiple formats.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for UI components
- Vite as the build tool and development server
- Wouter for client-side routing
- TanStack React Query for server state management and data fetching
- Shadcn/ui with Radix UI components for the component library
- Tailwind CSS for styling with a custom design system
- Recharts for data visualization

**Design Decisions:**
- **Component-based architecture**: Uses a modular approach with reusable UI components stored in `client/src/components/ui/`
- **State management**: React Query handles all server state, eliminating the need for Redux or similar libraries. This provides automatic caching, background refetching, and optimistic updates
- **Routing strategy**: Wouter provides a lightweight routing solution with authenticated and unauthenticated route guards
- **Design system**: Custom theme built on top of Shadcn/ui with CSS variables for colors, allowing easy theme switching between light and dark modes

**Key Pages:**
- Landing page for unauthenticated users
- Dashboard with statistics and visualizations
- Upload page for OCR screenshot processing
- Entries page for managing timesheet records
- Reports page with charts and analytics
- Calendar view with iCal/ICS export functionality
- Admin panel for user management (admin-only)

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js as the web server
- TypeScript for type safety
- Drizzle ORM for database operations
- Neon (PostgreSQL) as the database provider
- Tesseract.js for OCR processing
- Replit Auth (OpenID Connect) for authentication

**Design Decisions:**
- **RESTful API design**: All API endpoints follow REST conventions with proper HTTP methods (GET, POST, DELETE)
- **Session-based authentication**: Uses Replit's OpenID Connect with PostgreSQL-backed session storage for security and scalability
- **Modular structure**: Separates concerns into distinct files (routes, storage, OCR processing, authentication)
- **Type-safe schema sharing**: Uses a shared schema definition between frontend and backend to ensure type consistency

**API Structure:**
- `/api/auth/*` - Authentication endpoints (login, logout, user info)
- `/api/dashboard/stats` - Aggregated dashboard statistics
- `/api/timesheet-entries/*` - CRUD operations for timesheet entries
- `/api/weekly-summaries` - Weekly aggregated time data
- `/api/upload/ocr` - OCR screenshot processing endpoint
- `/api/notifications/*` - Notification CRUD and read status management

### Database Schema

**Technology:** PostgreSQL (via Neon) with Drizzle ORM

**Core Tables:**
1. **sessions** - Session storage for authentication (required by connect-pg-simple)
2. **users** - User profile information (firstName, lastName, email, profileImageUrl, isAdmin, timezone, calendarDefaultProject)
3. **timesheetEntries** - Individual timesheet records with date, project, task, hours, status, and notes
4. **weeklySummaries** - Aggregated weekly data including total hours, lieu time earned, and standard hours worked
5. **notifications** - User notifications for hours discrepancies, lieu balance updates, and milestones (type, title, message, isRead, metadata)

**Design Decisions:**
- **UUID primary keys**: Uses PostgreSQL's `gen_random_uuid()` for unique identifiers
- **Cascade deletes**: User deletion automatically removes associated timesheet entries
- **Decimal precision**: Hours are stored with 5 digits total and 2 decimal places for accuracy
- **Date tracking**: Includes createdAt and updatedAt timestamps for audit trails
- **Status workflow**: Timesheet entries support pending/approved/rejected status for potential approval workflows

### Authentication & Authorization

**Mechanism:** Replit Auth (OpenID Connect / OAuth 2.0)

**Design Decisions:**
- **Third-party authentication**: Leverages Replit's authentication service to avoid managing passwords and user credentials
- **Session management**: Uses PostgreSQL-backed sessions with a 7-day TTL for security
- **Middleware protection**: `isAuthenticated` middleware protects all API routes requiring user context
- **Automatic user provisioning**: Users are automatically created/updated on first login using the upsert pattern

**Security Features:**
- HTTP-only cookies for session tokens
- Secure cookie flag enabled
- CSRF protection through session validation
- Session expiration handling with automatic redirect to login

### OCR Processing

**Technology:** Tesseract.js for browser and server-side OCR

**Implementation:**
- **Client-side processing**: Optional client-side OCR in the upload page for immediate feedback
- **Server-side processing**: Primary OCR processing occurs on the server for reliability
- **Text parsing**: Custom parsing logic extracts dates, hours, projects, and tasks from OCR output using regex patterns
- **Error handling**: Graceful fallbacks when OCR fails, allowing manual entry editing

**Design Decisions:**
- **Dual processing approach**: Allows flexibility between client and server processing
- **Format flexibility**: Supports multiple date formats (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)
- **Manual override**: Users can edit extracted data before saving to correct OCR errors

### Data Export

**Supported Formats:**
- CSV export using PapaParse
- PDF export using jsPDF with autoTable plugin
- iCal/ICS export for calendar integration

**Design Decisions:**
- **Client-side export**: Export functionality runs in the browser to reduce server load
- **Formatted output**: PDFs include proper headers, formatting, and generation timestamps
- **Selective export**: Users can filter data before exporting
- **Calendar integration**: iCal/ICS files can be imported into Google Calendar, Outlook, Apple Calendar, and other calendar applications

### Calendar Integration

**Features:**
- Visual monthly calendar view of timesheet entries
- Month navigation (previous/next/today buttons)
- Daily hour totals displayed on calendar days
- Entry count per day
- iCal/ICS export functionality for importing into external calendars
- User timezone and default project settings (stored in user profile)

**Design Decisions:**
- **Month-by-month view**: Shows all entries for the selected month
- **Visual indicators**: Today highlighted with border, days with entries have accent background
- **Export format**: Standard iCal/ICS format (RFC 5545) with VEVENT entries for each timesheet entry
- **Calendar settings**: Users can configure timezone and default project for calendar entries

### Weekly Hours & Lieu Time Calculation

**Business Logic:**
- Standard work week is 40 hours
- Hours beyond 40 per week accumulate as lieu time
- Weekly summaries automatically calculate total hours, standard hours, and lieu time earned
- Dashboard displays current lieu balance and weekly statistics

**Design Decisions:**
- **Automated calculations**: Weekly summaries are computed server-side to ensure consistency
- **Persistent tracking**: Lieu time accumulates across weeks in the database
- **Real-time updates**: Dashboard queries reflect the most current data

## External Dependencies

### Database & Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database provider
- **Drizzle ORM**: Type-safe database client and migration tool
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **openid-client**: Client library for OpenID Connect integration
- **Passport.js**: Authentication middleware framework

### Frontend Libraries
- **React 18**: UI framework
- **TanStack React Query**: Server state management
- **Wouter**: Lightweight routing library
- **Recharts**: Charting and data visualization
- **Shadcn/ui + Radix UI**: Comprehensive component library
- **Tailwind CSS**: Utility-first CSS framework

### Backend Libraries
- **Express.js**: Web application framework
- **Tesseract.js**: OCR engine for text extraction from images
- **Multer**: Middleware for handling multipart/form-data (file uploads)
- **Drizzle-kit**: Database migration and introspection tool

### Build & Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds

### Utility Libraries
- **PapaParse**: CSV parsing and generation
- **jsPDF + autoTable**: PDF generation with table support
- **date-fns**: Date manipulation and formatting
- **zod**: Runtime type validation and schema definition
- **nanoid**: Unique ID generation