import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, AnyPgColumn } from "drizzle-orm/pg-core";
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
  imageUrl: text("image_url"),
  // Theory subject limit (Default 2)
  maxLoad: integer("max_load").notNull().default(2),
  // NEW: Lab specific workload quota (Default 3)
  labLoad: integer("lab_load").notNull().default(3),
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
  sections: integer("sections").notNull().default(1), 
  capacity: integer("capacity").default(1),
  // NEW: Lab Support Fields
  isLab: boolean("is_lab").default(false),
  // Link this lab to a theory subject (self-reference)
  relatedTheoryId: varchar("related_theory_id").references((): AnyPgColumn => subjects.id),
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
  roundNumber: integer("round_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // NEW: Lab Specific Allocation Fields
  section: integer("section").default(1),
  role: text("role").default("theory"), // 'theory', 'coordinator', 'co_teacher'
}, (table) => ({
  // UNIQUE CONSTRAINT UPDATE:
  // A user cannot be in the SAME subject and SAME section twice.
  // But they CAN be in the same subject in different sections (e.g. Co-teacher in Sec 2 & 3)
  uniqueAllocation: sql`UNIQUE (${table.userId}, ${table.subjectId}, ${table.section})`,
}));

export const insertAllocationSchema = createInsertSchema(allocations).omit({
  id: true,
  createdAt: true,
});

export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type Allocation = typeof allocations.$inferSelect;

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

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  minPreferences: integer("min_preferences").notNull().default(7),
});

export type SystemSettings = typeof systemSettings.$inferSelect;