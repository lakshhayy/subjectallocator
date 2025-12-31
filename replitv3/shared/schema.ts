import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("faculty"), // "faculty" or "admin"
  seniority: integer("seniority").default(99), // Default seniority
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  semester: integer("semester").notNull(),
  type: text("type").notNull(), // "Core", "Elective", "Lab", "Project", "Internship"
  credits: integer("credits").notNull(),
  description: text("description").notNull(),
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
});

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

export const allocations = pgTable("allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate subject selections per faculty
  uniqueUserSubject: sql`UNIQUE (${table.userId}, ${table.subjectId})`,
}));

export const insertAllocationSchema = createInsertSchema(allocations).omit({
  id: true,
  createdAt: true,
});

export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type Allocation = typeof allocations.$inferSelect;

// ========== NEW TABLES FOR PROBABILITY SYSTEM ==========

// Table: Subject History (tracks which faculty taught what in past semesters)
export const subjectHistory = pgTable("subject_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(), // CSE 321, CSE 312, etc.
  name: text("name").notNull(), // "Machine Learning", "Compiler Design"
  semesterYear: text("semester_year").notNull(), // "Jul-Dec-2025", "Jan-Jun-2025"
  facultyId: varchar("faculty_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creditsTheory: integer("credits_theory").notNull(),
  creditsLab: integer("credits_lab").notNull(),
  subjectType: text("subject_type").notNull(), // "Theory", "Lab", "Seminar", "Project"
  category: text("category").notNull(), // "Networks", "ML", "Databases", "Security", "Compilers", "DataStructures", "Other"
});

export type SubjectHistory = typeof subjectHistory.$inferSelect;

// Table: Faculty Load History (tracks aggregate load per semester)
export const facultyLoadHistory = pgTable("faculty_load_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facultyId: varchar("faculty_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  semesterYear: text("semester_year").notNull(), // "Jul-Dec-2025", "Jan-Jun-2025"
  totalCredits: integer("total_credits").notNull(),
  numberOfSubjects: integer("number_of_subjects").notNull(),
  primarySpecialization: text("primary_specialization"), // "Networks", "ML", etc.
});

export type FacultyLoadHistory = typeof facultyLoadHistory.$inferSelect;

// Table: Subject Preferences (ranked list)
export const subjectPreferences = pgTable("subject_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(), // 1, 2, 3...
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserRank: sql`UNIQUE (${table.userId}, ${table.rank})`,
  uniqueUserSubject: sql`UNIQUE (${table.userId}, ${table.subjectId})`,
}));

export const insertSubjectPreferenceSchema = createInsertSchema(subjectPreferences).omit({
  id: true,
  createdAt: true,
});

export type InsertSubjectPreference = z.infer<typeof insertSubjectPreferenceSchema>;
export type SubjectPreference = typeof subjectPreferences.$inferSelect;

// Update Round Metadata for Counseling
export const roundMetadata = pgTable("round_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").notNull().unique(),
  semesterYear: text("semester_year").notNull(),
  roundNumber: integer("round_number").notNull(), // 1, 2
  status: text("status").notNull().default("not_started"), // "not_started", "active", "completed"
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  nextRoundStartTime: timestamp("next_round_start_time"), // For the 1-day gap
});

export type RoundMetadata = typeof roundMetadata.$inferSelect;
