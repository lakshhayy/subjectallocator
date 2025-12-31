# CSE Dept. Portal - Subject Allocator Development Guide

This guide provides the core snippets and logic used to build the Faculty Subject Allotment System for MANIT Bhopal.

## 1. Database Schema (Drizzle ORM)
The foundation of the project is the schema that handles users, subjects, and the probability system history.

```typescript
// shared/schema.ts
export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  semester: integer("semester").notNull(),
  type: text("type").notNull(), 
  credits: integer("credits").notNull(),
  description: text("description").notNull(),
});

export const subjectHistory = pgTable("subject_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(),
  facultyId: varchar("faculty_id").notNull().references(() => users.id),
  semesterYear: text("semester_year").notNull(),
  category: text("category").notNull(), // e.g., "Databases", "ML"
});
```

## 2. Probability Calculation Logic
This is the "brain" of the system that calculates assignment chances individually for each teacher.

```typescript
// server/storage.ts
async calculateSubjectProbabilities(userId: string) {
  const allHistory = await this.getSubjectHistory();
  const facultyHistory = allHistory.filter(h => h.facultyId === userId);

  return allSubjects.map(subject => {
    let score = 0;

    // 1. Individual History (40 pts)
    const individualCount = facultyHistory.filter(h => h.code === subject.code).length;
    if (individualCount >= 2) score += 40;
    else if (individualCount === 1) score += 25;

    // 2. Conflict/Seniority Penalty (-20 pts)
    const uniqueOthers = new Set(allHistory.filter(h => h.code === subject.code && h.facultyId !== userId).map(h => h.facultyId)).size;
    if (uniqueOthers > 2) score -= 20;

    // 3. Specialization Match (30 pts)
    const subjectCategory = this.extractCategory(subject.name);
    if (facultyHistory.some(h => h.category === subjectCategory)) score += 15;

    return { ...subject, probabilityScore: Math.min(100, Math.max(0, score)) };
  });
}
```

## 3. Frontend Integration
The React frontend fetches these probabilities and displays them using Shadcn UI components.

```tsx
// client/src/pages/allotment.tsx
const { data: probabilities = [] } = useQuery<SubjectProbability[]>({
  queryKey: ["probabilities"],
  queryFn: async () => {
    const response = await fetch("/api/subjects/probabilities");
    return response.json();
  },
});

// Mapping to Subject Cards
<SubjectCard 
  subject={subject}
  probability={probabilityMap.get(subject.id)}
/>
```

## 5. How to Run Locally

To run this project on your own machine, follow these steps:

### Prerequisites
- **Node.js**: Version 18 or higher.
- **PostgreSQL**: A running instance of a Postgres database.

### Steps
1. **Clone/Download the files**: Get the source code into a folder on your computer.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Database**:
   - Create a `.env` file in the root directory.
   - Add your database connection string:
     ```env
     DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
     ```
4. **Setup Database Schema**:
   ```bash
   npm run db:push
   ```
5. **Seed Initial Data** (Users, Subjects, and History):
   ```bash
   npx tsx server/seed.ts
   ```
6. **Start Development Server**:
   ```bash
   npm run dev
   ```
7. **Access the App**: Open your browser and navigate to `http://localhost:5000`.

### Troubleshooting
- **Environment Variables**: Ensure `DATABASE_URL` is correctly set.
- **Port**: The default port is 5000. Ensure it's not being used by another application.
- **Database Connection**: Verify your Postgres service is running and accessible with the credentials provided.
