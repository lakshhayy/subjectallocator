# How to Build the Subject Allocator Project from Scratch
## Complete Step-by-Step Development Guide

---

## PHASE 1: PROJECT SETUP & INITIALIZATION

### Step 1.1: Project Foundation
Start with a blank directory and initialize your project:

```bash
# Create project directory
mkdir subject-allocator
cd subject-allocator

# Initialize Node.js project
npm init -y

# Create directory structure
mkdir client server shared script
mkdir client/src client/public
mkdir client/src/components client/src/pages client/src/lib client/src/hooks
```

### Step 1.2: Install Core Dependencies

```bash
# Install backend dependencies
npm install express express-session passport passport-local
npm install pg drizzle-orm
npm install zod

# Install frontend dependencies
npm install react react-dom react-hook-form
npm install @tanstack/react-query wouter

# Install styling
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx

# Install build tools
npm install -D vite @vitejs/plugin-react
npm install -D typescript tsx
npm install -D tailwindcss

# Install UI components
npm install @radix-ui/react-dialog @radix-ui/react-button
npm install lucide-react sonner
```

### Step 1.3: Create TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForEnumMembers": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

---

## PHASE 2: DATABASE DESIGN & SCHEMA

### Step 2.1: Why PostgreSQL?

PostgreSQL is chosen because:
- **Relational Data**: User → Allocations ← Subjects (many-to-many relationship)
- **Data Integrity**: Foreign keys prevent orphaned records
- **Performance**: Joins are fast for analytics queries
- **Scalability**: Can handle thousands of faculty and subjects
- **Built-in Features**: Constraints, indexes, transactions

### Step 2.2: Design Database Schema

**Think about your entities:**

1. **Users** - Who is using the system?
   - Faculty members who select subjects
   - Admins who view analytics
   
2. **Subjects** - What are they selecting?
   - CS101, CS102, etc.
   - Organized by semester
   - Different types (Core, Elective, Lab)

3. **Allocations** - Who selected what?
   - Links between users and subjects
   - Tracks preferences/selections
   - Timestamp for audit trail

**Relationships:**
```
One User → Many Allocations → Many Subjects
One Subject → Many Allocations → Many Users
```

This is a **many-to-many** relationship: a faculty can select many subjects, and a subject can be selected by many faculty.

### Step 2.3: Create Database Schema (Drizzle ORM)

**shared/schema.ts:**
```typescript
import { pgTable, varchar, text, integer, timestamp, sql } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// TABLE 1: Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // VARCHAR with UUID: each user gets a unique identifier
  
  username: text("username").notNull().unique(),
  // UNIQUE: only one person can have this username
  
  password: text("password").notNull(),
  // Stores password (should be hashed in production!)
  
  name: text("name").notNull(),
  // Full name of faculty/admin
  
  role: text("role").notNull().default("faculty"),
  // "faculty" or "admin" - determines access level
});

// TABLE 2: Subjects
export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  code: text("code").notNull().unique(),
  // CS101, CS102, etc. - unique identifier
  
  name: text("name").notNull(),
  // "Data Structures", "Algorithms", etc.
  
  semester: integer("semester").notNull(),
  // 1-8: which semester this subject is in
  
  type: text("type").notNull(),
  // "Core", "Elective", "Lab", "Project", "Internship"
  
  credits: integer("credits").notNull(),
  // 3, 4, etc.
  
  description: text("description").notNull(),
  // Course description
});

// TABLE 3: Allocations (Many-to-Many Junction)
export const allocations = pgTable("allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull().references(() => users.id, { 
    onDelete: "cascade" 
  }),
  // FOREIGN KEY: Link to user who selected
  // CASCADE: If user deleted, delete their allocations
  
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { 
    onDelete: "cascade" 
  }),
  // FOREIGN KEY: Link to subject selected
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // When was this selection made?
  
  // UNIQUE CONSTRAINT: Prevent duplicate selections
  // Can't have same user select same subject twice
}, (table) => ({
  uniqueUserSubject: sql`UNIQUE (${table.userId}, ${table.subjectId})`,
}));
```

**Why this structure?**

```
DATABASE STRUCTURE
================

users table:
┌───────────────┬──────────┬──────────┬─────────┐
│ id            │ username │ password │ role    │
├───────────────┼──────────┼──────────┼─────────┤
│ uuid-1        │ mchawla  │ pass123  │ faculty │
│ uuid-2        │ admin    │ admin123 │ admin   │
└───────────────┴──────────┴──────────┴─────────┘

subjects table:
┌───────────────┬──────┬─────────────────┬──────────┐
│ id            │ code │ name            │ semester │
├───────────────┼──────┼─────────────────┼──────────┤
│ uuid-101      │ CS101│ Data Structures │ 2        │
│ uuid-102      │ CS102│ Algorithms      │ 2        │
└───────────────┴──────┴─────────────────┴──────────┘

allocations table (joins them):
┌───────────────┬──────────┬────────────┬──────────────┐
│ id            │ user_id  │ subject_id │ created_at   │
├───────────────┼──────────┼────────────┼──────────────┤
│ uuid-alloc-1  │ uuid-1   │ uuid-101   │ 2025-12-24   │
│ uuid-alloc-2  │ uuid-1   │ uuid-102   │ 2025-12-24   │
└───────────────┴──────────┴────────────┴──────────────┘

This shows: User uuid-1 (mchawla) selected subjects uuid-101 (CS101) and uuid-102 (CS102)
```

---

## PHASE 3: BACKEND API DEVELOPMENT

### Step 3.1: Database Connection Layer

**server/db.ts:**
```typescript
// This file creates the bridge between your app and database

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// Create a connection pool to database
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Reads from environment variable: postgresql://user:pass@localhost/db
});

// Create Drizzle instance (ORM)
export const db = drizzle(pool, { schema });
// Now you can use: db.select(), db.insert(), db.delete(), etc.
```

### Step 3.2: Data Access Layer (Storage)

**server/storage.ts:**
```typescript
// This layer handles all database queries
// Isolates database logic from API routes

import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { users, subjects, allocations } from "@shared/schema";

export class DatabaseStorage {
  // USER OPERATIONS
  
  // Get one user by ID
  async getUser(id: string) {
    return await db.select().from(users).where(eq(users.id, id)).limit(1);
  }
  
  // Get one user by username (for login)
  async getUserByUsername(username: string) {
    return await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
  }
  
  // SUBJECT OPERATIONS
  
  // Get all subjects
  async getAllSubjects() {
    return await db.select().from(subjects);
  }
  
  // Get subjects by semester
  async getSubjectsBySemester(semester: number) {
    return await db.select()
      .from(subjects)
      .where(eq(subjects.semester, semester));
  }
  
  // ALLOCATION OPERATIONS
  
  // Get all subjects selected by one faculty
  async getUserAllocations(userId: string) {
    return await db
      .select()
      .from(allocations)
      .where(eq(allocations.userId, userId))
      // JOIN with subjects to get details
      .leftJoin(subjects, eq(allocations.subjectId, subjects.id));
  }
  
  // Create new allocation (faculty selects a subject)
  async createAllocation(userId: string, subjectId: string) {
    return await db.insert(allocations)
      .values({ userId, subjectId })
      .returning();
  }
  
  // Delete allocation (faculty deselects a subject)
  async deleteAllocation(id: string) {
    await db.delete(allocations).where(eq(allocations.id, id));
  }
  
  // Get ALL allocations (admin view)
  async getAllAllocations() {
    return await db
      .select()
      .from(allocations)
      // JOIN with users and subjects to get full details
      .leftJoin(users, eq(allocations.userId, users.id))
      .leftJoin(subjects, eq(allocations.subjectId, subjects.id));
  }
}

export const storage = new DatabaseStorage();
```

### Step 3.3: Express Server Setup

**server/index.ts:**
```typescript
// Main entry point - starts the API server

import express from "express";
import session from "express-session";
import { registerRoutes } from "./routes";

const app = express();

// MIDDLEWARE 1: Session Management
app.use(session({
  secret: "development-secret", // Should be env variable
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true in production (HTTPS only)
    httpOnly: true, // JavaScript can't access cookies
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
}));

// MIDDLEWARE 2: Parse JSON request body
app.use(express.json());

// MIDDLEWARE 3: Parse form data
app.use(express.urlencoded({ extended: false }));

// MIDDLEWARE 4: Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Register all API routes
await registerRoutes(app);

// Start server on port 5000
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
```

### Step 3.4: API Routes

**server/routes.ts:**
```typescript
// All API endpoints defined here

import express from "express";
import { storage } from "./storage";
import { z } from "zod";

// MIDDLEWARE: Check if user is logged in
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// MIDDLEWARE: Check if user is admin
function requireAdmin(req, res, next) {
  if (req.session.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

export function registerRoutes(app) {
  
  // =============== AUTH ROUTES ===============
  
  // LOGIN: User enters username/password
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    
    // Find user in database
    const user = await storage.getUserByUsername(username);
    
    // Check if user exists and password matches
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Create session (browser stores session cookie)
    req.session.userId = user.id;
    req.session.user = user;
    
    // Return user data (without password)
    res.json({ user: { id: user.id, name: user.name, role: user.role } });
  });
  
  // LOGOUT: Destroy session
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
  });
  
  // CHECK SESSION: Is user still logged in?
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId);
    res.json({ user });
  });
  
  // =============== SUBJECT ROUTES ===============
  
  // GET ALL SUBJECTS
  app.get("/api/subjects", requireAuth, async (req, res) => {
    const subjects = await storage.getAllSubjects();
    res.json(subjects);
  });
  
  // GET SUBJECTS BY SEMESTER
  app.get("/api/subjects/semester/:semester", requireAuth, async (req, res) => {
    const semester = parseInt(req.params.semester);
    const subjects = await storage.getSubjectsBySemester(semester);
    res.json(subjects);
  });
  
  // =============== ALLOCATION ROUTES ===============
  
  // GET MY SELECTIONS (faculty views their selections)
  app.get("/api/allocations/my", requireAuth, async (req, res) => {
    const allocations = await storage.getUserAllocations(req.session.userId);
    res.json(allocations);
  });
  
  // CREATE SELECTION (faculty selects a subject)
  app.post("/api/allocations", requireAuth, async (req, res) => {
    const { subjectId } = req.body;
    
    // Validation: subject must exist
    const subject = await storage.getSubjectById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    
    // Validation: only 3 selections per faculty
    const count = await storage.checkAllocationLimit(req.session.userId);
    if (count >= 3) {
      return res.status(400).json({ message: "Max 3 subjects allowed" });
    }
    
    // Create allocation (database unique constraint prevents duplicates)
    try {
      const allocation = await storage.createAllocation(
        req.session.userId,
        subjectId
      );
      res.json(allocation);
    } catch (error) {
      res.status(400).json({ message: "Already selected this subject" });
    }
  });
  
  // DELETE SELECTION (faculty deselects a subject)
  app.delete("/api/allocations/:id", requireAuth, async (req, res) => {
    await storage.deleteAllocation(req.params.id);
    res.json({ message: "Deleted" });
  });
  
  // =============== ADMIN ROUTES ===============
  
  // GET ANALYTICS (admin dashboard)
  app.get("/api/admin/analytics", requireAuth, requireAdmin, async (req, res) => {
    const allocations = await storage.getAllAllocations();
    
    // Process raw data for analytics
    const totalSubjects = allocations.length;
    const totalFaculty = new Set(allocations.map(a => a.users.id)).size;
    
    // Group by faculty
    const byFaculty = allocations.reduce((acc, a) => {
      const key = a.users.id;
      if (!acc[key]) acc[key] = { user: a.users, subjects: [] };
      acc[key].subjects.push(a.subjects);
      return acc;
    }, {});
    
    // Group by subject
    const bySubject = allocations.reduce((acc, a) => {
      const key = a.subjects.id;
      if (!acc[key]) acc[key] = { subject: a.subjects, faculty: [] };
      acc[key].faculty.push(a.users);
      return acc;
    }, {});
    
    res.json({
      totalSubjects,
      totalFaculty,
      facultyAllocations: Object.values(byFaculty),
      subjectAllocations: Object.values(bySubject),
    });
  });
}
```

---

## PHASE 4: FRONTEND DEVELOPMENT

### Step 4.1: React Project Setup

**client/src/main.tsx:**
```typescript
// Entry point for React app

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**client/index.html:**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Subject Allocator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 4.2: Authentication Context

**client/src/lib/auth.tsx:**
```typescript
// Global auth state - accessible from any component

import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'faculty' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is already logged in (on app load)
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUser(data.user))
      .finally(() => setLoading(false));
  }, []);
  
  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });
    
    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    setUser(data.user);
  };
  
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Step 4.3: Login Page

**client/src/pages/login.tsx:**
```typescript
// Simple login form

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(username, password);
      // Login successful - redirect to home
      setLocation('/');
    } catch (err) {
      setError('Invalid credentials');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Sign In</h1>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Sign In
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Demo Credentials:</p>
          <p className="text-sm">Faculty: mchawla / password123</p>
          <p className="text-sm">Admin: admin / admin123</p>
        </div>
      </div>
    </div>
  );
}
```

### Step 4.4: Faculty Subject Selection Page

**client/src/pages/allotment.tsx:**
```typescript
// Faculty selects subjects

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';

export default function AllotmentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSemester, setSelectedSemester] = useState(1);
  
  // Fetch all subjects
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => fetch('/api/subjects', { credentials: 'include' })
      .then(r => r.json()),
  });
  
  // Fetch user's current selections
  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations-my'],
    queryFn: () => fetch('/api/allocations/my', { credentials: 'include' })
      .then(r => r.json()),
  });
  
  // Mutation: Select a subject
  const selectMutation = useMutation({
    mutationFn: (subjectId: string) =>
      fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
        credentials: 'include',
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations-my'] });
    },
  });
  
  // Mutation: Deselect a subject
  const deselectMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/allocations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations-my'] });
    },
  });
  
  // Get subjects for selected semester
  const subjectsForSemester = allSubjects.filter(
    (s: any) => s.semester === selectedSemester
  );
  
  // Track which subjects are selected
  const selectedIds = new Set(allocations.map((a: any) => a.subjectId));
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Select Subjects</h1>
      
      {/* Semester tabs */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
          <button
            key={sem}
            onClick={() => setSelectedSemester(sem)}
            className={`px-4 py-2 rounded ${
              selectedSemester === sem
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            Semester {sem}
          </button>
        ))}
      </div>
      
      {/* Selection count */}
      <div className="mb-4">
        <p className="text-lg font-semibold">
          Selected: {allocations.length}/3 subjects
        </p>
      </div>
      
      {/* Subject grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjectsForSemester.map((subject: any) => {
          const isSelected = selectedIds.has(subject.id);
          const allocationId = allocations.find(
            (a: any) => a.subjectId === subject.id
          )?.id;
          
          return (
            <div key={subject.id} className="border rounded-lg p-4">
              <h3 className="font-bold text-lg">{subject.code}</h3>
              <p className="text-gray-600">{subject.name}</p>
              <p className="text-sm text-gray-500">
                {subject.credits} credits • {subject.type}
              </p>
              
              {isSelected ? (
                <button
                  onClick={() => deselectMutation.mutate(allocationId!)}
                  className="mt-4 w-full bg-red-500 text-white py-2 rounded"
                >
                  Deselect
                </button>
              ) : (
                <button
                  onClick={() => selectMutation.mutate(subject.id)}
                  disabled={allocations.length >= 3}
                  className={`mt-4 w-full py-2 rounded text-white ${
                    allocations.length >= 3
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  Select
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Step 4.5: Admin Dashboard

**client/src/pages/admin-dashboard.tsx:**
```typescript
// Admin views analytics

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Only admins can view this
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setLocation('/allotment');
    }
  }, [user]);
  
  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => fetch('/api/admin/analytics', { credentials: 'include' })
      .then(r => r.json()),
    enabled: user?.role === 'admin',
  });
  
  if (!analytics) return <div>Loading...</div>;
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-600">Total Subjects</p>
          <p className="text-2xl font-bold">{analytics.totalSubjects}</p>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-600">Total Allocations</p>
          <p className="text-2xl font-bold">{analytics.totalFaculty}</p>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-600">Faculty Participated</p>
          <p className="text-2xl font-bold">{analytics.totalFaculty}</p>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-600">Unallocated</p>
          <p className="text-2xl font-bold text-red-500">
            {analytics.unallocatedSubjects}
          </p>
        </div>
      </div>
      
      {/* Faculty allocations */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-xl font-bold mb-4">Faculty Selections</h2>
        {analytics.facultyAllocations.map((fac: any) => (
          <div key={fac.user.id} className="border-b pb-4 mb-4">
            <p className="font-bold">{fac.user.name}</p>
            <div className="flex gap-2 mt-2">
              {fac.subjects.map((subj: any) => (
                <span
                  key={subj.id}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded"
                >
                  {subj.code}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Subject allocations */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">By Subject</h2>
        {analytics.subjectAllocations.map((subj: any) => (
          <div key={subj.subject.id} className="border-b pb-4 mb-4">
            <p className="font-bold">
              {subj.subject.code} - {subj.subject.name}
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {subj.faculty.map((fac: any) => (
                <span
                  key={fac.id}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded"
                >
                  {fac.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 4.6: Routing Setup

**client/src/App.tsx:**
```typescript
// Main app - handles routing

import { Router, Route, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/lib/auth';
import LoginPage from '@/pages/login';
import HomePage from '@/pages/home';
import AllotmentPage from '@/pages/allotment';
import AdminDashboard from '@/pages/admin-dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Route path="/login" component={LoginPage} />
        
        {/* Protected routes */}
        <Route path="/" component={HomePage} />
        <Route path="/allotment" component={AllotmentPage} />
        <Route path="/admin-dashboard" component={AdminDashboard} />
        
        <Route path="/:rest*" component={() => <div>404 Not Found</div>} />
      </Router>
    </AuthProvider>
  );
}

export default App;
```

---

## PHASE 5: COMPLETE WORKFLOW EXPLANATION

### How Login Works

```
1. USER ENTERS CREDENTIALS
   ├─ Username: "mchawla"
   └─ Password: "password123"
   
2. FRONTEND SENDS REQUEST
   └─ POST /api/auth/login
      └─ Body: { username: "mchawla", password: "password123" }
   
3. BACKEND PROCESSES
   ├─ Query: SELECT * FROM users WHERE username = "mchawla"
   ├─ Compare: user.password === "password123" ?
   ├─ Create: req.session.userId = "uuid-123"
   ├─ Store: req.session.user = { id, name, role }
   └─ Browser: Receives Set-Cookie header with session ID
   
4. BROWSER STORES SESSION
   └─ Cookie: connect.sid=abc123xyz (stored locally)
   
5. SUBSEQUENT REQUESTS
   ├─ Browser automatically includes: Cookie: connect.sid=abc123xyz
   └─ Backend checks: req.session.userId is set? ✓
   
6. REDIRECT
   └─ React checks user.role
      ├─ If "faculty" → navigate to /allotment
      └─ If "admin" → navigate to /admin-dashboard
```

### How Subject Selection Works

```
1. FACULTY VIEWS SEMESTER
   ├─ Click: Semester 2 tab
   ├─ Request: GET /api/subjects/semester/2
   └─ Response: [CS101, CS102, CS103, ...]

2. FACULTY CLICKS "SELECT" BUTTON
   ├─ Subject: "CS101" (Data Structures)
   ├─ Request: POST /api/allocations
   │           { subjectId: "uuid-101" }
   └─ Headers: Cookie: connect.sid=... (session ID)

3. BACKEND VALIDATES
   ├─ Check 1: Is user logged in? (req.session.userId exists)
   ├─ Check 2: Does subject exist?
   ├─ Check 3: Does user have < 3 allocations?
   ├─ Check 4: Hasn't user already selected this?
   └─ All pass? ✓

4. BACKEND STORES IN DATABASE
   └─ INSERT INTO allocations
      └─ VALUES (user_id: "uuid-123", subject_id: "uuid-101", created_at: now())

5. DATABASE RETURNS
   ├─ New allocation record
   └─ With ID, timestamps, etc.

6. FRONTEND UPDATES
   ├─ React Query refetch: GET /api/allocations/my
   ├─ Update local cache
   ├─ Re-render: Button changes from "Select" → "Deselect"
   ├─ Counter: "1/3" → "2/3"
   └─ User sees change immediately ✓

7. ADMIN VIEWS ANALYTICS
   ├─ GET /api/admin/analytics
   ├─ Backend counts allocations
   ├─ Groups by faculty
   ├─ Groups by subject
   └─ Returns summary
   
8. ADMIN SEES
   ├─ Total Allocations: 1 (increased)
   ├─ Faculty Participated: 1
   ├─ Faculty "mchawla" → CS101
   └─ Subject "CS101" → mchawla
```

### How Admin Analytics Works

```
RAW DATA FROM DATABASE
======================
allocations table:
┌────────┬─────────────┬────────────┐
│ id     │ user_id     │ subject_id │
├────────┼─────────────┼────────────┤
│ alloc1 │ uuid-user-1 │ uuid-sub-1 │  ← User 1 selected Subject 1
│ alloc2 │ uuid-user-1 │ uuid-sub-2 │  ← User 1 selected Subject 2
│ alloc3 │ uuid-user-2 │ uuid-sub-1 │  ← User 2 selected Subject 1
└────────┴─────────────┴────────────┘

BACKEND PROCESSING (server/routes.ts)
=====================================

1. Get all allocations with joins:
   SELECT a.*, u.*, s.*
   FROM allocations a
   LEFT JOIN users u ON a.user_id = u.id
   LEFT JOIN subjects s ON a.subject_id = s.id
   
   Result:
   [
     { allocation: alloc1, user: User1, subject: Subject1 },
     { allocation: alloc2, user: User1, subject: Subject2 },
     { allocation: alloc3, user: User2, subject: Subject1 }
   ]

2. Group by Faculty:
   {
     "uuid-user-1": {
       user: User1,
       subjects: [Subject1, Subject2]  ← User 1 selected these
     },
     "uuid-user-2": {
       user: User2,
       subjects: [Subject1]  ← User 2 selected these
     }
   }

3. Group by Subject:
   {
     "uuid-sub-1": {
       subject: Subject1,
       faculty: [User1, User2]  ← These users selected Subject 1
     },
     "uuid-sub-2": {
       subject: Subject2,
       faculty: [User1]  ← User 1 selected Subject 2
     }
   }

4. Calculate Stats:
   - totalAllocations: 3 (3 rows in allocations table)
   - totalFaculty: 2 (unique users)
   - totalSubjects: 119 (total subjects in DB)
   - unallocatedSubjects: 119 - 2 = 117 (subjects nobody selected)

RESPONSE TO ADMIN
=================
{
  totalSubjects: 119,
  totalAllocations: 3,
  totalFaculty: 2,
  unallocatedSubjects: 117,
  facultyAllocations: [
    {
      user: { id: "...", name: "User 1", username: "user1" },
      subjects: [Subject1, Subject2]
    },
    {
      user: { id: "...", name: "User 2", username: "user2" },
      subjects: [Subject1]
    }
  ],
  subjectAllocations: [
    {
      subject: { id: "...", code: "CS101", name: "...", semester: 2 },
      faculty: [User1, User2]
    },
    {
      subject: { id: "...", code: "CS102", name: "...", semester: 2 },
      faculty: [User1]
    }
  ]
}

FRONTEND DISPLAYS
=================
Dashboard shows:
- 119 total subjects
- 3 allocations made
- 2 faculty participated
- 117 subjects unallocated

Lists:
- User 1: Selected CS101, CS102
- User 2: Selected CS101

- CS101: Selected by User1, User2
- CS102: Selected by User1
```

---

## PHASE 6: KEY CONCEPTS TO UNDERSTAND

### 1. Session Management
```
User logs in → Server creates session → Browser stores session ID cookie
Each request includes session ID → Server identifies user from session
User logs out → Server destroys session → Browser loses session access
```

### 2. Many-to-Many Relationship
```
Without Allocations table (WRONG):
users.subjectIds = [sub1, sub2, sub3]  ❌ Can't store multiple values
subjects.userIds = [user1, user2]      ❌ Can't store multiple values

With Allocations table (RIGHT):
┌─────────┐         ┌──────────────┐         ┌──────────┐
│ users   │ ←───→   │ allocations  │   ←───→ │ subjects │
│ id: 1   │ 1:N     │ user_id: 1   │ N:1     │ id: 101  │
│ id: 2   │         │ subject_id:1 │         │ id: 102  │
└─────────┘         │ user_id: 1   │         │ id: 103  │
                    │ subject_id:2 │         └──────────┘
                    └──────────────┘

Can now query:
- "All subjects selected by user 1" → Query allocations WHERE user_id = 1
- "All users who selected subject 101" → Query allocations WHERE subject_id = 101
```

### 3. Authentication vs Authorization
```
Authentication: "Are you who you claim?" (Login)
└─ Do credentials match? → Login allowed

Authorization: "Are you allowed to do this?" (Access control)
└─ Is user role = admin? → Allow admin dashboard
└─ Is user role = faculty? → Block admin dashboard
```

### 4. Request/Response Flow
```
Client                              Server
  │                                  │
  ├─ Make request (with auth) ──→    │
  │  (POST /api/allocations)         │
  │  (Cookie: session-id)            │
  │                                  │
  │                                  ├─ Check auth (middleware)
  │                                  ├─ Validate input (Zod)
  │                                  ├─ Query database
  │                                  ├─ Return result
  │                                  │
  │ ←─ Get response (JSON) ───────── ┤
  │  (200: Success)                  │
  │  (400: Bad request)              │
  │  (401: Unauthorized)             │
  │  (403: Forbidden)                │
  │  (500: Server error)             │
  │                                  │
  ├─ Update UI ─────────────────────→│
```

---

## PHASE 7: STEP-BY-STEP DEVELOPMENT CHECKLIST

### Week 1: Foundation
- [ ] Set up Node.js project structure
- [ ] Install all dependencies
- [ ] Create TypeScript config
- [ ] Set up PostgreSQL database
- [ ] Create database schema (users, subjects, allocations)
- [ ] Write Drizzle ORM schema file

### Week 2: Backend API
- [ ] Create database connection (db.ts)
- [ ] Create storage layer (storage.ts)
- [ ] Set up Express server (index.ts)
- [ ] Implement auth routes (login, logout, me)
- [ ] Implement subject routes (GET all, GET by semester)
- [ ] Implement allocation routes (CRUD)
- [ ] Implement admin routes (analytics)
- [ ] Test all endpoints with Postman/curl

### Week 3: Frontend Setup
- [ ] Create React app with Vite
- [ ] Set up authentication context
- [ ] Create login page
- [ ] Set up routing with Wouter
- [ ] Test login/logout flow

### Week 4: Faculty Interface
- [ ] Create subject selection page
- [ ] Add semester tabs
- [ ] Implement select/deselect functionality
- [ ] Show selection counter
- [ ] Add error handling

### Week 5: Admin Interface
- [ ] Create admin dashboard
- [ ] Fetch and display analytics
- [ ] Display stats cards
- [ ] List faculty allocations
- [ ] List subject-wise mapping

### Week 6: Polish & Deploy
- [ ] Add CSS styling (TailwindCSS)
- [ ] Add form validation
- [ ] Add error messages
- [ ] Test all functionality
- [ ] Deploy to production

---

## CONCLUSION

Building this project teaches you:

1. **Full-stack development**: Frontend + Backend + Database
2. **Database design**: Entity relationships, constraints
3. **API development**: RESTful endpoints, HTTP status codes
4. **Authentication**: Sessions, user roles, authorization
5. **React patterns**: Hooks, context, state management
6. **Real-time updates**: React Query, cache invalidation

The project flows: **User logs in → Views subjects → Selects 3 → Admin sees analytics**

Every piece is connected: Database → Backend API → Frontend UI

Start with the database (the heart), build the API (the brain), then create the UI (the face).

**Happy coding!**
