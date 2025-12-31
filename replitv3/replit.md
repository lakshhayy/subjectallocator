# Subject Allocator - CSE Dept. Portal

## Overview
A Faculty Subject Allotment System for the Department of CSE at MANIT Bhopal. Faculty members can select subjects they want to teach, and administrators can manage the allotment process.

## Project Architecture
- **Subject Allotment Engine**: JAC/JOSAA style seniority-based algorithm with ranked preference lists (min 3 subjects).
- **Counseling System**: Multi-round counseling with 1-day gaps managed via `round_metadata`.
- **Probability Scoring**: Individualized faculty scores based on teaching history, load, and specialization.

## Recent Changes
- **Ranked Preferences**: Enabled faculty to submit and rank subject choices.
- **Allotment Logic**: Implemented seniority-based allocation algorithm in the backend.
- **Counseling Rounds**: Added support for sequential counseling rounds with administrative controls.
- **Admin Dashboard**: Integrated allotment round triggers for department administrators.
- **UI Enhancements**: Updated allotment and dashboard interfaces for the counseling workflow.

## Development Commands
- `npm run dev` - Start development server (serves both API and client on port 5000)
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run db:push` - Push database schema changes
- `npx tsx server/seed.ts` - Seed database with demo data

## Demo Credentials
- Faculty: mchawla, nkhare, etc. with password `password123`
- Admin: admin with password `admin123`

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (automatically configured)
- `SESSION_SECRET` - Session secret key (optional, has default)
