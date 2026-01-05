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
  email: text("email"),
  designation: text("designation"),
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
  // NEW: Sections controls how many faculty can take this subject (e.g., 3 for 3 Sections)
  sections: integer("sections").notNull().default(1), 
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

// ========== PROBABILITY SYSTEM TABLES ==========

export const subjectHistory = pgTable("subject_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(), 
  name: text("name").notNull(),
  semesterYear: text("semester_year").notNull(), 
  facultyId: varchar("faculty_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creditsTheory: integer("credits_theory").notNull(),
  creditsLab: integer("credits_lab").notNull(),
  subjectType: text("subject_type").notNull(), 
  category: text("category").notNull(), 
});

export type SubjectHistory = typeof subjectHistory.$inferSelect;

export const facultyLoadHistory = pgTable("faculty_load_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facultyId: varchar("faculty_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  semesterYear: text("semester_year").notNull(), 
  totalCredits: integer("total_credits").notNull(),
  numberOfSubjects: integer("number_of_subjects").notNull(),
  primarySpecialization: text("primary_specialization"), 
});

export type FacultyLoadHistory = typeof facultyLoadHistory.$inferSelect;

export const subjectPreferences = pgTable("subject_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(), 
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

export const roundMetadata = pgTable("round_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: varchar("round_id").notNull().unique(),
  semesterYear: text("semester_year").notNull(),
  roundNumber: integer("round_number").notNull(), 
  status: text("status").notNull().default("not_started"), 
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  nextRoundStartTime: timestamp("next_round_start_time"), 
});

export type RoundMetadata = typeof roundMetadata.$inferSelect;

// System Settings Table (Singleton)
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  minPreferences: integer("min_preferences").notNull().default(7),
});

export type SystemSettings = typeof systemSettings.$inferSelect;