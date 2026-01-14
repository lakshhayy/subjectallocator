import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  subjects, 
  allocations,
  subjectPreferences,
  roundMetadata,
  systemSettings,
  type User, 
  type InsertUser,
  type Subject,
  type Allocation,
  type InsertAllocation,
  type SubjectPreference,
  type RoundMetadata,
  type SystemSettings
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllFaculty(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  updateFacultySeniority(items: { id: string; seniority: number }[]): Promise<void>;
  updateFacultyLoad(id: string, maxLoad: number): Promise<void>; // NEW

  // Subject operations
  getAllSubjects(): Promise<Subject[]>;
  getSubjectById(id: string): Promise<Subject | undefined>;
  getSubjectsBySemester(semester: number): Promise<Subject[]>;
  createSubject(subject: any): Promise<Subject>;
  createSubjectsBulk(subjects: any[]): Promise<Subject[]>;
  updateSubject(id: string, subject: any): Promise<Subject>;
  deleteSubject(id: string): Promise<void>;

  // Allocation operations
  getUserAllocations(userId: string): Promise<(Allocation & { subject: Subject })[]>;
  createAllocation(allocation: InsertAllocation): Promise<Allocation>;
  deleteAllocation(id: string): Promise<void>;
  getAllAllocations(): Promise<(Allocation & { user: User; subject: Subject })[]>;
  checkAllocationLimit(userId: string): Promise<number>;

  // Preference operations
  getUserPreferences(userId: string): Promise<(SubjectPreference & { subject: Subject })[]>;
  savePreferences(userId: string, prefs: { subjectId: string; rank: number }[]): Promise<void>;
  resetAllSelections(): Promise<void>;

  // Round operations
  getActiveRound(): Promise<RoundMetadata | undefined>;

  // System Settings operations
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllFaculty(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.role, "faculty"))
      .orderBy(users.seniority);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateFacultySeniority(items: { id: string; seniority: number }[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(users)
          .set({ seniority: item.seniority })
          .where(eq(users.id, item.id));
      }
    });
  }

  // Subject operations
  async getAllSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects).orderBy(subjects.semester, subjects.code);
  }

  async getSubjectById(id: string): Promise<Subject | undefined> {
    const result = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
    return result[0];
  }

  async getSubjectsBySemester(semester: number): Promise<Subject[]> {
    return await db.select().from(subjects).where(eq(subjects.semester, semester));
  }

  async createSubject(subject: any): Promise<Subject> {
    const result = await db.insert(subjects).values(subject).returning();
    return result[0];
  }

  async createSubjectsBulk(subjectsList: any[]): Promise<Subject[]> {
    return await db.insert(subjects).values(subjectsList).returning();
  }

  async updateSubject(id: string, subject: any): Promise<Subject> {
    const result = await db.update(subjects).set(subject).where(eq(subjects.id, id)).returning();
    return result[0];
  }

  async deleteSubject(id: string): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  // Allocation operations
  async getUserAllocations(userId: string): Promise<(Allocation & { subject: Subject })[]> {
    const result = await db
      .select()
      .from(allocations)
      .where(eq(allocations.userId, userId))
      .leftJoin(subjects, eq(allocations.subjectId, subjects.id))
      .orderBy(desc(allocations.createdAt));

    return result.map(row => ({
      ...row.allocations,
      roundNumber: row.allocations.roundNumber || 1, 
      subject: row.subjects!
    }));
  }

  async createAllocation(allocation: InsertAllocation): Promise<Allocation> {
    const result = await db.insert(allocations).values(allocation).returning();
    return result[0];
  }

  async deleteAllocation(id: string): Promise<void> {
    await db.delete(allocations).where(eq(allocations.id, id));
  }

  async getAllAllocations(): Promise<(Allocation & { user: User; subject: Subject })[]> {
    const result = await db
      .select()
      .from(allocations)
      .leftJoin(users, eq(allocations.userId, users.id))
      .leftJoin(subjects, eq(allocations.subjectId, subjects.id))
      .orderBy(desc(allocations.createdAt));

    return result.map(row => ({
      ...row.allocations,
      user: row.users!,
      subject: row.subjects!
    }));
  }

  async getRawAllocations(): Promise<Allocation[]> {
    return await db.select().from(allocations);
  }

  async checkAllocationLimit(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(allocations)
      .where(eq(allocations.userId, userId));
    return result.length;
  }

  // Preference operations
  async getUserPreferences(userId: string): Promise<(SubjectPreference & { subject: Subject })[]> {
    const result = await db
      .select()
      .from(subjectPreferences)
      .where(eq(subjectPreferences.userId, userId))
      .leftJoin(subjects, eq(subjectPreferences.subjectId, subjects.id))
      .orderBy(subjectPreferences.rank);

    return result.map(row => ({
      ...row.subject_preferences,
      subject: row.subjects!
    }));
  }

  async savePreferences(userId: string, prefs: { subjectId: string; rank: number }[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Clear existing
      await tx.delete(subjectPreferences).where(eq(subjectPreferences.userId, userId));
      // Insert new
      if (prefs.length > 0) {
        await tx.insert(subjectPreferences).values(
          prefs.map(p => ({ ...p, userId }))
        );
      }
    });
  }

  async resetAllSelections(): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(subjectPreferences);
      await tx.delete(allocations);
      await tx.update(roundMetadata).set({ status: "active" });
    });
  }

  // Round operations
  async getActiveRound(): Promise<RoundMetadata | undefined> {
    const result = await db
      .select()
      .from(roundMetadata)
      .where(eq(roundMetadata.status, "active"))
      .limit(1);
    return result[0];
  }

  // System Settings Implementation
  async getSystemSettings(): Promise<SystemSettings> {
    const result = await db.select().from(systemSettings).limit(1);
    if (result.length === 0) {
      const defaults = await db.insert(systemSettings).values({ minPreferences: 7 }).returning();
      return defaults[0];
    }
    return result[0];
  }

  async updateFacultyLoad(id: string, maxLoad: number): Promise<void> {
    await db.update(users)
      .set({ maxLoad })
      .where(eq(users.id, id));
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSystemSettings();
    const result = await db.update(systemSettings)
      .set(settings)
      .where(eq(systemSettings.id, current.id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();