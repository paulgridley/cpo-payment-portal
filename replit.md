# Payment Portal Application

## Overview

This is a full-stack payment portal application built with a React frontend and Express backend. The application handles customer subscription payments using Stripe integration, with a focus on penalty charge notice (PCN) payment plans. The system allows customers to set up recurring monthly payments over exactly 3 billing cycles (day 1, day 31, day 61).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### August 28, 2025 - Popup Payment System & Azure Deployment
- Implemented popup payment system to separate email collection from main form
- Streamlined main form to only require PCN number, vehicle registration, and penalty amount
- Created dedicated /payment page for secure email input and terms acceptance
- Updated all payment buttons to open popup with URL parameters
- Successfully deployed to Azure App Service with complete popup functionality
- Maintained full Stripe Subscription Schedules integration for 3-payment system

### August 26, 2025 - CPO Design Implementation
- Completely redesigned payment portal to match Civil Parking Office (CPO) website design
- Updated header with CPO logo and navigation menu structure
- Implemented dark hero section with "Your Parking Charge" branding
- Restructured form layout to match original CPO design exactly
- Added help section with Q&A and payment schedule display
- Updated all text to use British spelling ("Pay in Instalments")
- Applied consistent payment logic across all payment buttons

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Payment Integration**: Stripe React SDK for secure payment processing

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Payment Processing**: Stripe API for subscription management
- **Session Management**: Express sessions with PostgreSQL store
- **Development**: Hot reload with Vite middleware integration

### Data Storage
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Migrations**: Drizzle Kit for database schema management
- **Fallback Storage**: In-memory storage implementation for development

## Key Components

### Database Schema
- **Customers Table**: Stores customer information including email, PCN number, vehicle registration, and Stripe integration data
- **Fields**: id (UUID), email (unique), pcnNumber, vehicleRegistration, stripeCustomerId, stripeSubscriptionId, stripeSubscriptionScheduleId, createdAt

### Payment Flow
1. Customer enters payment details on the payment portal
2. System creates or retrieves customer record
3. Stripe customer and subscription are created
4. **Subscription Schedule**: System automatically creates a subscription schedule limiting payments to exactly 3 billing cycles (30 days apart)
5. Payment confirmation and success handling
6. **Automatic termination**: Subscription automatically cancels after 3rd payment (day 61)

### Frontend Components
- **Payment Portal**: Main form for customer data collection and payment setup
- **Payment Success**: Confirmation page with next steps information
- **UI Components**: Comprehensive shadcn/ui component library including forms, cards, buttons, and payment elements

### Backend Services
- **Storage Interface**: Abstracted storage layer with both database and in-memory implementations
- **Route Handlers**: RESTful API endpoints for subscription creation
- **Stripe Integration**: Secure payment processing and subscription management

## Data Flow

1. **Customer Registration**: User submits email, PCN number, and vehicle registration
2. **Customer Lookup**: System checks for existing customer records
3. **Stripe Integration**: Creates Stripe customer and subscription objects
4. **Database Persistence**: Stores customer and Stripe relationship data
5. **Payment Processing**: Handles secure payment confirmation via Stripe
6. **Success Confirmation**: Redirects to success page with subscription details

## External Dependencies

### Core Dependencies
- **@stripe/stripe-js & @stripe/react-stripe-js**: Stripe payment integration
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm & @neondatabase/serverless**: Database ORM and Neon connection
- **express**: Web application framework
- **react & react-dom**: Frontend UI framework

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant management
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for Node.js

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React application to `dist/public`
- **Backend**: esbuild bundles Express server to `dist/index.js`
- **Assets**: Static assets served from build output

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **STRIPE_SECRET_KEY**: Stripe API secret key (required)
- **VITE_STRIPE_PUBLIC_KEY**: Stripe publishable key for frontend

### Production Setup
- **Single Server**: Express serves both API routes and static frontend
- **Database**: PostgreSQL via Neon serverless platform
- **Payment Processing**: Stripe handles all payment operations
- **Session Management**: PostgreSQL-backed session store for scalability

### Development Features
- **Hot Reload**: Vite middleware provides instant feedback during development
- **Error Handling**: Runtime error overlay for development debugging
- **Request Logging**: Detailed API request logging with response capture
- **Type Safety**: Full TypeScript coverage across frontend and backend