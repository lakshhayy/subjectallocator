# Subject Allocator - Project Blueprint
## Faculty Subject Allotment System for CSE Department, MANIT Bhopal

---

## 1. PROJECT OVERVIEW

### Purpose
The Subject Allocator is a web-based application designed to streamline the process of allocating teaching subjects to faculty members in the Department of Computer Science and Engineering at MANIT Bhopal.

### Key Features
- **Faculty Self-Selection**: Faculty members can select up to 3 subjects they wish to teach
- **Subject Management**: Admin can view all subjects across all semesters
- **Analytics Dashboard**: Real-time analytics showing allocation statistics and faculty selections
- **Role-Based Access**: Different interfaces for faculty and administrator users
- **Secure Authentication**: Login system with password verification

### Target Users
- **Faculty Members**: Can view available subjects and select preferred subjects
- **Administrators**: Can view comprehensive analytics and allocation reports
- **Department Head**: Oversees the entire allocation process

---

## 2. TECHNOLOGY STACK

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.1.9
- **Routing**: Wouter 3.3.5 (client-side routing)
- **UI Library**: Shadcn/UI (custom components)
- **Styling**: TailwindCSS 4.1.14 with PostCSS
- **State Management**: React Query (@tanstack/react-query 5.60.5)
- **Form Handling**: React Hook Form 7.66.0 with Zod validation
- **Icons**: Lucide React 0.545.0
- **Animations**: Framer Motion 12.23.24
- **Charts**: Recharts 2.15.4

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.21.2
- **Language**: TypeScript 5.6.3
- **Execution**: tsx 4.20.5
- **Session Management**: express-session 1.18.1 with connect-pg-simple
- **Authentication**: Passport.js 0.7.0 with Local strategy

### Database
- **Engine**: PostgreSQL (Neon-backed)
- **ORM**: Drizzle ORM 0.39.3
- **Migration Tool**: Drizzle Kit 0.31.4
- **Validation**: drizzle-zod 0.7.0 (Schema to Zod)

### Development Tools
- **Replit Plugins**: Cartographer, Dev Banner, Runtime Error Modal
- **Package Manager**: npm (Node Package Manager)

---

## 3. SYSTEM ARCHITECTURE

### High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (React)                     │
│  ┌──────────────────┬──────────────────┬──────────────────┐ │
│  │  Login Page      │  Faculty Portal  │  Admin Dashboard │ │
│  │  (Auth)          │  (Subject Sel.)  │  (Analytics)     │ │
│  └──────────────────┴──────────────────┴──────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────┴────────────────────────────────────┐
│               API LAYER (Express.js)                        │
│  ┌──────────────────┬──────────────────┬──────────────────┐ │
│  │ Auth Routes      │  Subject Routes  │  Admin Routes    │ │
│  │ (Login/Logout)   │  (Get Subjects)  │  (Analytics)     │ │
│  └──────────────────┴──────────────────┴──────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐│
│  │        Allocation Routes (CRUD Operations)             ││
│  └──────────────────────────────────────────────────────────┘│
└────────────────────────┬────────────────────────────────────┘
                         │ Drizzle ORM
┌────────────────────────┴────────────────────────────────────┐
│          DATABASE LAYER (PostgreSQL)                        │
│  ┌──────────────────┬──────────────────┬──────────────────┐ │
│  │  Users Table     │  Subjects Table  │  Allocations Tbl │ │
│  │  (Auth)          │  (Course Info)   │  (Selections)    │ │
│  └──────────────────┴──────────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. DATABASE SCHEMA

### Entity-Relationship Diagram

```
┌────────────────────────────────────────────────────────────┐
│                        USERS                               │
├────────────────────────────────────────────────────────────┤
│ id (UUID) ────────────────┐                                │
│ username (VARCHAR)        │                                │
│ password (TEXT)           │                                │
│ name (TEXT)               │                                │
│ role (TEXT) [faculty|admin]                                │
└────────────────────────────────────────────────────────────┘
                            │ (1:N)
                            │ Allocations.user_id
                            │
┌────────────────────────────────────────────────────────────┐
│                    ALLOCATIONS                             │
├────────────────────────────────────────────────────────────┤
│ id (UUID)                                                  │
│ user_id (FK → Users)      ────────┐                       │
│ subject_id (FK → Subjects) ────┐  │                       │
│ created_at (TIMESTAMP)     │   │  │                       │
│ UNIQUE(user_id, subject_id)│   │  │                       │
└────────────────────────────────────────────────────────────┘
                            │   │
                      (N:1) │   │ (N:1)
                            │   │
                            │   │ Allocations.subject_id
                            │   │
┌────────────────────────────────────────────────────────────┐
│                     SUBJECTS                               │
├────────────────────────────────────────────────────────────┤
│ id (UUID)                                                  │
│ code (VARCHAR) [e.g. CS101]                               │
│ name (TEXT) [e.g. Data Structures]                        │
│ semester (INTEGER) [1-8]                                  │
│ type (TEXT) [Core|Elective|Lab|Project|Internship]        │
│ credits (INTEGER)                                          │
│ description (TEXT)                                         │
└────────────────────────────────────────────────────────────┘
```

### Table Definitions

#### USERS Table
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'faculty' -- 'faculty' or 'admin'
);
```

#### SUBJECTS Table
```sql
CREATE TABLE subjects (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  semester INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'Core', 'Elective', 'Lab', 'Project', 'Internship'
  credits INTEGER NOT NULL,
  description TEXT NOT NULL
);
```

#### ALLOCATIONS Table
```sql
CREATE TABLE allocations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id VARCHAR NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, subject_id) -- Prevent duplicate allocations
);
```

---

## 5. PROJECT STRUCTURE

```
Subject-Allocator/
├── client/                          # React Frontend
│   ├── public/
│   │   ├── favicon.png
│   │   └── opengraph.jpg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Shadcn UI Components (40+ files)
│   │   │   │   ├── button.tsx       # Button component
│   │   │   │   ├── card.tsx         # Card container
│   │   │   │   ├── dialog.tsx       # Modal dialogs
│   │   │   │   ├── form.tsx         # Form wrapper
│   │   │   │   ├── input.tsx        # Text input
│   │   │   │   ├── table.tsx        # Data table
│   │   │   │   ├── tabs.tsx         # Tab interface
│   │   │   │   └── ... (35+ more)
│   │   │   ├── layout.tsx           # Main layout wrapper
│   │   │   └── subject-card.tsx     # Subject display card
│   │   ├── hooks/
│   │   │   ├── use-mobile.tsx       # Mobile detection hook
│   │   │   └── use-toast.ts         # Toast notification hook
│   │   ├── lib/
│   │   │   ├── auth.tsx             # Auth context & hooks
│   │   │   ├── mock-data.ts         # Sample subject data
│   │   │   ├── queryClient.ts       # React Query config
│   │   │   ├── users.ts             # Demo user credentials
│   │   │   └── utils.ts             # Utility functions
│   │   ├── pages/
│   │   │   ├── login.tsx            # Login page
│   │   │   ├── home.tsx             # Redirects to role-based page
│   │   │   ├── allotment.tsx        # Faculty subject selection
│   │   │   ├── admin-dashboard.tsx  # Admin analytics
│   │   │   └── not-found.tsx        # 404 page
│   │   ├── App.tsx                  # Main app component
│   │   ├── main.tsx                 # React entry point
│   │   └── index.css                # Global styles
│   ├── index.html                   # HTML entry point
│   └── tsconfig.json                # TypeScript config
│
├── server/                          # Express Backend
│   ├── index.ts                     # Server entry point & session config
│   ├── routes.ts                    # All API route definitions
│   ├── db.ts                        # Database connection setup
│   ├── storage.ts                   # Database operations (DAL)
│   ├── seed.ts                      # Database seeding script
│   ├── static.ts                    # Production static file serving
│   └── vite.ts                      # Development Vite integration
│
├── shared/                          # Shared Code
│   └── schema.ts                    # Database schema (Drizzle ORM)
│
├── script/
│   └── build.ts                     # Build script
│
├── migrations/                      # Auto-generated DB migrations
│   └── ... (Generated by Drizzle)
│
├── dist/                            # Production build output
│   └── public/                      # Built frontend
│
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite configuration
├── drizzle.config.ts                # Drizzle ORM configuration
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # TailwindCSS configuration
├── components.json                  # Shadcn components config
├── vite-plugin-meta-images.ts       # Custom Vite plugin
└── replit.md                        # Project documentation
```

---

## 6. API ENDPOINTS

### Authentication Routes

#### POST /api/auth/login
**Purpose**: Authenticate user and create session
```
Request Body:
{
  "username": "string",
  "password": "string"
}

Response (200):
{
  "user": {
    "id": "uuid",
    "username": "string",
    "name": "string",
    "role": "faculty|admin"
  }
}

Response (401):
{
  "message": "Invalid credentials"
}
```

#### POST /api/auth/logout
**Purpose**: Destroy user session
```
Response (200):
{
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
**Purpose**: Get current logged-in user
**Authentication**: Required
```
Response (200):
{
  "user": {
    "id": "uuid",
    "username": "string",
    "name": "string",
    "role": "faculty|admin"
  }
}

Response (401):
{
  "message": "Unauthorized"
}
```

---

### Subject Routes

#### GET /api/subjects
**Purpose**: Retrieve all subjects
**Authentication**: Required
```
Response (200):
[
  {
    "id": "uuid",
    "code": "CS101",
    "name": "Data Structures",
    "semester": 2,
    "type": "Core",
    "credits": 3,
    "description": "..."
  },
  ...
]
```

#### GET /api/subjects/semester/:semester
**Purpose**: Get subjects by semester
**Authentication**: Required
```
URL Parameter:
semester: number (1-8)

Response (200):
[
  { subject objects }
]
```

---

### Allocation Routes (CRUD)

#### POST /api/allocations
**Purpose**: Create new subject allocation (faculty selects a subject)
**Authentication**: Required
```
Request Body:
{
  "subjectId": "uuid"
}

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "subjectId": "uuid",
  "createdAt": "2025-12-24T..."
}

Response (400):
{
  "message": "You can only select up to 3 subjects"
}

Response (400):
{
  "message": "You have already selected this subject"
}
```

#### GET /api/allocations/my
**Purpose**: Get all allocations made by current faculty
**Authentication**: Required
```
Response (200):
[
  {
    "id": "uuid",
    "userId": "uuid",
    "subjectId": "uuid",
    "createdAt": "2025-12-24T...",
    "subject": {
      "id": "uuid",
      "code": "CS101",
      "name": "Data Structures",
      "semester": 2,
      "type": "Core",
      "credits": 3,
      "description": "..."
    }
  },
  ...
]
```

#### DELETE /api/allocations/:id
**Purpose**: Remove an allocation (faculty deselects a subject)
**Authentication**: Required
```
URL Parameter:
id: allocation uuid

Response (200):
{
  "message": "Allocation deleted successfully"
}
```

---

### Admin Routes

#### GET /api/admin/allocations
**Purpose**: View all allocations in the system
**Authentication**: Required | Admin: Required
```
Response (200):
[
  {
    "id": "uuid",
    "userId": "uuid",
    "subjectId": "uuid",
    "createdAt": "2025-12-24T...",
    "user": {
      "id": "uuid",
      "name": "Dr. John",
      "username": "jsmith",
      "role": "faculty"
    },
    "subject": {
      "id": "uuid",
      "code": "CS101",
      "name": "Data Structures",
      "semester": 2,
      "type": "Core",
      "credits": 3,
      "description": "..."
    }
  },
  ...
]

Response (403):
{
  "message": "Forbidden: Admin access required"
}
```

#### GET /api/admin/analytics
**Purpose**: Get comprehensive allocation analytics
**Authentication**: Required | Admin: Required
```
Response (200):
{
  "totalSubjects": 119,
  "totalAllocations": 45,
  "totalFaculty": 15,
  "unallocatedSubjects": 80,
  "facultyAllocations": [
    {
      "user": {
        "id": "uuid",
        "name": "Dr. John Smith",
        "username": "jsmith"
      },
      "subjects": [
        {
          "id": "uuid",
          "code": "CS101",
          "name": "Data Structures",
          "semester": 2
        },
        ...
      ]
    },
    ...
  ],
  "subjectAllocations": [
    {
      "subject": {
        "id": "uuid",
        "code": "CS101",
        "name": "Data Structures",
        "semester": 2
      },
      "faculty": [
        {
          "id": "uuid",
          "name": "Dr. John Smith",
          "username": "jsmith"
        },
        ...
      ]
    },
    ...
  ]
}
```

---

## 7. USER FLOWS

### Faculty User Flow
```
1. User arrives at application
   └─→ /login (public route)

2. Faculty logs in with credentials
   └─→ POST /api/auth/login
   └─→ Session created, redirected to /allotment

3. Faculty views available subjects
   └─→ GET /api/subjects (all) or /api/subjects/semester/:sem
   └─→ Subjects displayed in UI by semester

4. Faculty selects up to 3 subjects
   └─→ POST /api/allocations (for each selection)
   └─→ System prevents duplicate selections
   └─→ System prevents >3 selections

5. Faculty views their selections
   └─→ GET /api/allocations/my
   └─→ Displays selected subjects with details

6. Faculty deselects a subject (optional)
   └─→ DELETE /api/allocations/:id
   └─→ Subject removed from their list

7. Faculty logs out
   └─→ POST /api/auth/logout
   └─→ Redirected to /login
```

### Admin User Flow
```
1. Admin logs in with admin credentials
   └─→ POST /api/auth/login (username: admin, password: admin123)
   └─→ Session created, redirected to /admin-dashboard

2. Admin views analytics dashboard
   └─→ GET /api/admin/analytics
   └─→ Dashboard displays:
       - Total subjects count
       - Total allocations made
       - Number of faculty who selected
       - Subjects with no allocations
       - Faculty-wise allocation breakdown
       - Subject-wise faculty mapping

3. Admin monitors allocation process
   └─→ Real-time data from database
   └─→ Can identify:
       - Which subjects are over-allocated
       - Which faculty haven't selected
       - Which subjects are unallocated

4. Admin logs out
   └─→ POST /api/auth/logout
```

---

## 8. FRONTEND COMPONENTS

### Page Components

#### LoginPage (/login)
**Responsibility**: User authentication
- Username and password form inputs
- Submit button to authenticate
- Error message display
- Demo credentials display for testing
- Redirect on successful login (to /allotment for faculty, /admin-dashboard for admin)

#### AllotmentPage (/allotment)
**Responsibility**: Faculty subject selection interface
- Semester tabs for navigation
- Subject cards displaying subject information
- "Select" buttons for subjects
- Visual indication of selected subjects
- Deselect option for previously selected subjects
- Count display (e.g., "2/3 selected")
- Responsive grid layout

#### AdminDashboard (/admin-dashboard)
**Responsibility**: Admin analytics and reporting
- Statistics cards: total subjects, allocations, faculty, unallocated
- Faculty Allocations section: shows each faculty and their selected subjects
- Subject-wise Faculty Mapping: shows each subject and which faculty chose it
- Real-time data updates

#### HomePage (/)
**Responsibility**: Navigation and role-based redirection
- Automatically redirects based on user role
- If faculty: redirects to /allotment
- If admin: redirects to /admin-dashboard
- If not logged in: redirects to /login

#### NotFoundPage (/404)
**Responsibility**: Handle invalid routes
- User-friendly error message
- Link back to home page

### UI Component Library (Shadcn/UI)
The application uses 40+ pre-built Shadcn/UI components:
- **Layout**: Card, Layout
- **Forms**: Input, Button, Checkbox, RadioGroup, Select, Textarea, Form
- **Navigation**: Tabs, NavigationMenu, Breadcrumb, Pagination
- **Dialogs**: Dialog, AlertDialog, Sheet, Popover
- **Display**: Table, Badge, Avatar, Separator, Progress, Slider
- **Data**: Carousel, Command, SelectComponent
- **Feedback**: Toast, Sonner notifications, Spinner
- **And 20+ more specialized components**

---

## 9. AUTHENTICATION & AUTHORIZATION

### Session Management
- Uses `express-session` with PostgreSQL store (`connect-pg-simple`)
- Session data stored in database for persistence
- Session expires after 24 hours of inactivity
- Secure cookies (httpOnly in production)

### User Roles
```
Faculty:
- Can view available subjects
- Can select up to 3 subjects
- Can deselect subjects
- Cannot access admin features
- Redirected away from /admin-dashboard

Admin:
- Can view all allocations
- Can view analytics dashboard
- Can see faculty selections breakdown
- Can see subject allocation breakdown
- Full system visibility
```

### Authentication Flow
```
Client                          Server
  │                               │
  ├──── POST /api/auth/login ───→ │
  │     (username, password)      │
  │                               ├─ Verify credentials
  │                               ├─ Create session
  │                               ├─ Set Session ID cookie
  │                               │
  ← ────── Session Cookie ───────┤
  │                               │
  ├──── GET /api/auth/me ────────→ │
  │  (with Session Cookie)        │
  │                               ├─ Check session
  │                               ├─ Return user data
  │                               │
  ← ────── User Data ───────────┤
```

---

## 10. STATE MANAGEMENT

### Client-Side State

#### React Context (Auth)
- Manages global authentication state
- Provides `useAuth()` hook for components
- Stores current user information
- Handles login/logout operations

#### React Query
- Manages server state (subjects, allocations, analytics)
- Automatic caching and synchronization
- Query keys: `subjects`, `allocations-my`, `admin-analytics`
- Automatic refetching on focus

#### Local Component State
- Form inputs managed with React Hook Form
- UI state (modals, dropdowns) managed with React hooks
- Loading states during API calls

---

## 11. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    SUBJECT SELECTION FLOW                   │
└─────────────────────────────────────────────────────────────┘

Faculty User Interface
    │
    ├─ View Subjects
    │   └──→ GET /api/subjects
    │        └──→ Express Server
    │             └──→ storage.getAllSubjects()
    │                  └──→ Query subjects table
    │                       └──→ Return to client
    │
    ├─ Select Subject (Click "Select" button)
    │   └──→ POST /api/allocations
    │        { subjectId: "xyz" }
    │        └──→ Express Server
    │             ├─ Verify user is authenticated
    │             ├─ Check allocation count < 3
    │             ├─ Check subject exists
    │             ├─ Check no duplicate allocation
    │             └─→ storage.createAllocation()
    │                  └──→ Insert into allocations table
    │                       └──→ Return allocation to client
    │                            └──→ Update local cache
    │                                 └──→ UI updates
    │
    ├─ View Selected Subjects
    │   └──→ GET /api/allocations/my
    │        └──→ Express Server
    │             └──→ storage.getUserAllocations()
    │                  ├─ Query allocations table (userId)
    │                  ├─ Join with subjects table
    │                  └──→ Return with subject details
    │
    └─ Deselect Subject
        └──→ DELETE /api/allocations/:id
             └──→ Express Server
                  └──→ storage.deleteAllocation()
                       └──→ Delete from allocations table
                            └──→ Return success
                                 └──→ Update local cache

┌─────────────────────────────────────────────────────────────┐
│                    ADMIN ANALYTICS FLOW                      │
└─────────────────────────────────────────────────────────────┘

Admin Dashboard
    │
    └─ Load Analytics
        └──→ GET /api/admin/analytics
             ├─ Verify user is admin
             └──→ Express Server
                  └──→ GET all subjects & allocations
                       ├─ Query subjects table
                       ├─ Query allocations table (with joins)
                       │  ├─ Join with users table
                       │  └─ Join with subjects table
                       │
                       ├─ Calculate statistics
                       │  ├─ Total subjects count
                       │  ├─ Total allocations count
                       │  ├─ Count unique faculty
                       │  └─ Find unallocated subjects
                       │
                       ├─ Group by Faculty
                       │  └─ For each faculty: list their subjects
                       │
                       ├─ Group by Subject
                       │  └─ For each subject: list faculty who chose it
                       │
                       └──→ Return analytics object
                            └──→ Display in dashboard
                                 ├─ Stats cards
                                 ├─ Faculty allocations table
                                 └─ Subject-wise mapping table
```

---

## 12. DEPLOYMENT ARCHITECTURE

### Development Environment
- **Server**: Vite dev server with hot module reloading
- **Port**: 5000 (both API and frontend served together)
- **Host**: 0.0.0.0 (accessible from any network interface)
- **Database**: PostgreSQL local/Replit instance
- **Sessions**: In-memory store or PostgreSQL store

### Production Environment
- **Build Process**: 
  ```bash
  npm run build
  # Outputs: dist/public (frontend) + dist/index.cjs (backend)
  ```
- **Runtime**: Node.js with production Express server
- **Port**: 5000
- **Database**: PostgreSQL production instance
- **Sessions**: PostgreSQL store (connect-pg-simple)
- **Static Files**: Served by Express from dist/public

### Deployment Command
```bash
npm run start
# Runs: NODE_ENV=production node dist/index.cjs
```

---

## 13. KEY FEATURES & CONSTRAINTS

### Features
✅ User authentication with password verification
✅ Role-based access control (Faculty/Admin)
✅ Subject selection (max 3 per faculty)
✅ Duplicate selection prevention
✅ Real-time analytics dashboard
✅ Faculty allocation tracking
✅ Subject allocation tracking
✅ Responsive UI design
✅ Session persistence

### Constraints
- Maximum 3 subject selections per faculty member
- No duplicate subject selection per user
- Password stored as plain text (development only - should be hashed in production)
- Admin role cannot select subjects (separate admin interface)
- Subject codes must be unique
- Username must be unique

---

## 14. DEVELOPMENT WORKFLOW

### Installation
```bash
npm install
```

### Database Setup
```bash
npm run db:push          # Apply schema to database
npx tsx server/seed.ts   # Load demo data
```

### Development Server
```bash
npm run dev
# Starts on http://localhost:5000
# Backend: Express + API routes
# Frontend: Vite with hot reload
```

### Type Checking
```bash
npm run check
# Runs TypeScript compiler
```

### Production Build
```bash
npm run build
# Outputs compiled files to dist/
```

### Run Production
```bash
npm run start
# Runs compiled application
```

---

## 15. DEMO CREDENTIALS

### Faculty Accounts
Multiple faculty accounts available:
- Username: mchawla, Password: password123
- Username: nkhare, Password: password123
- Username: [27 more faculty accounts]

### Admin Account
- Username: admin
- Password: admin123

Total Demo Data:
- 30 users (29 faculty + 1 admin)
- 119 subjects across semesters 1-8
- Multiple subject types: Core, Elective, Lab, Project, Internship

---

## 16. SECURITY CONSIDERATIONS

### Implemented
✅ Session-based authentication
✅ Role-based access control
✅ Protected API endpoints (requireAuth middleware)
✅ Admin-only endpoints (requireAdmin middleware)
✅ CSRF protection via session cookies
✅ Password comparison (basic)
✅ Input validation with Zod schemas

### Improvements Needed (Production)
❌ Password hashing (bcrypt or similar)
❌ HTTPS/TLS enforcement
❌ Rate limiting on login
❌ CORS configuration
❌ SQL injection prevention (mitigated by ORM)
❌ Session secret should be environment variable

---

## 17. ERROR HANDLING

### Client-Side
- Toast notifications for errors
- User-friendly error messages
- Loading states during API calls
- Redirect on unauthorized access

### Server-Side
- HTTP status codes (200, 400, 401, 403, 404, 500)
- JSON error responses with messages
- Request validation with Zod
- Database error handling
- Try-catch blocks around async operations

---

## 18. FUTURE ENHANCEMENTS

1. **Password Security**
   - Implement bcrypt password hashing
   - Add password reset functionality

2. **Advanced Analytics**
   - Export reports as PDF/CSV
   - Historical tracking of allocations
   - Conflict detection (overfull subjects)

3. **User Management**
   - Admin can add/edit users
   - Bulk user import
   - User activity logs

4. **Subject Management**
   - Admin can add/edit subjects
   - Mark subjects as full
   - Set allocation priorities

5. **Notifications**
   - Email notifications for faculty
   - Allocation deadline reminders
   - Admin alerts for unallocated subjects

6. **Advanced Features**
   - Multi-round allocation with preferences
   - Conflict resolution algorithms
   - Load balancing (distribute evenly)
   - API rate limiting

---

## 19. SYSTEM REQUIREMENTS

### Development
- Node.js v18+ (v20 recommended)
- PostgreSQL 12+
- 100 MB disk space for dependencies
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Production
- Node.js v18+ 
- PostgreSQL 12+
- Internet connection for package CDNs
- HTTPS certificate recommended

---

## 20. SUMMARY

**Subject Allocator** is a full-stack web application built with modern technologies (React, Express, PostgreSQL) that streamlines the subject allocation process for faculty members in an academic institution. 

The system features:
- Clean separation of concerns (client/server/database)
- Type-safe development with TypeScript
- Responsive UI with Shadcn/UI components
- Robust API with proper authentication and authorization
- PostgreSQL database with Drizzle ORM
- Production-ready deployment configuration

The architecture supports scaling to handle hundreds of faculty and thousands of subjects while maintaining data integrity through database constraints and application-level validation.

---

**Document Version**: 1.0
**Last Updated**: December 24, 2025
**Project Status**: Functional, Ready for Testing
