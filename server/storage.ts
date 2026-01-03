import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  subjects, 
  allocations,
  subjectHistory,
  facultyLoadHistory,
  subjectPreferences,
  roundMetadata,
  systemSettings,
  type User, 
  type InsertUser,
  type Subject,
  type Allocation,
  type InsertAllocation,
  type SubjectHistory,
  type FacultyLoadHistory,
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

  // Subject operations
  getAllSubjects(): Promise<Subject[]>;
  getSubjectById(id: string): Promise<Subject | undefined>;
  getSubjectsBySemester(semester: number): Promise<Subject[]>;
  createSubject(subject: any): Promise<Subject>;
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

  // Probability operations
  getSubjectHistory(facultyId?: string): Promise<SubjectHistory[]>;
  getFacultyLoadHistory(facultyId: string): Promise<FacultyLoadHistory[]>;
  calculateSubjectProbabilities(userId: string): Promise<any[]>;

  // System Settings operations (NEW)
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

  // ========== PROBABILITY SYSTEM OPERATIONS ==========

  async getSubjectHistory(facultyId?: string): Promise<SubjectHistory[]> {
    if (facultyId) {
      return await db.select().from(subjectHistory).where(eq(subjectHistory.facultyId, facultyId));
    }
    return await db.select().from(subjectHistory);
  }

  async getFacultyLoadHistory(facultyId: string): Promise<FacultyLoadHistory[]> {
    return await db.select().from(facultyLoadHistory).where(eq(facultyLoadHistory.facultyId, facultyId));
  }

  // FIXED SYNTAX ERROR HERE
  async calculateSubjectProbabilities(userId: string): Promise<any[]> {
    const allSubjects = await this.getAllSubjects();
    const allHistory = await this.getSubjectHistory();
    const facultyHistory = allHistory.filter(h => h.facultyId === userId);
    const loadHistory = await this.getFacultyLoadHistory(userId);

    const previousLoad = loadHistory.sort((a, b) => 
      new Date(b.semesterYear).getTime() - new Date(a.semesterYear).getTime()
    )[0];

    return allSubjects.map(subject => {
      let score = 0;

      const individualCount = facultyHistory.filter(h => h.code === subject.code).length;
      if (individualCount >= 2) score += 40;
      else if (individualCount === 1) score += 25;

      const uniqueOthers = new Set(allHistory.filter(h => h.code === subject.code && h.facultyId !== userId).map(h => h.facultyId)).size;

      if (uniqueOthers > 2) score -= 20; 
      else if (uniqueOthers > 0) score -= 10; 

      if (previousLoad) {
        if (previousLoad.totalCredits < 8) score += 30; 
        else if (previousLoad.totalCredits < 12) score += 15; 
      } else {
        score += 20; 
      }

      const primarySpec = previousLoad?.primarySpecialization;
      const subjectCategory = this.extractCategory(subject.name);

      if (primarySpec === subjectCategory) score += 30;
      else if (facultyHistory.some(h => h.category === subjectCategory)) score += 15;

      const finalScore = Math.min(100, Math.max(0, score));

      return {
        ...subject,
        probabilityScore: finalScore,
        riskLevel: this.getRiskLevel(finalScore),
        recommendation: this.getRecommendation(finalScore),
        historicalData: {
          teachingCount: individualCount,
          contestedBy: uniqueOthers,
          lastTaughtCount: facultyHistory.length,
        }
      };
    });
  }

  private extractCategory(name: string): string {
    if (name.includes("Network")) return "Networks";
    if (name.includes("Machine Learning") || name.includes("ML") || name.includes("AI")) return "ML";
    if (name.includes("Database") || name.includes("DBMS")) return "Databases";
    if (name.includes("Security") || name.includes("Hacking")) return "Security";
    if (name.includes("Compiler")) return "Compilers";
    if (name.includes("Data Structure")) return "DataStructures";
    if (name.includes("Wireless")) return "Networks";
    return "Other";
  }

  private getRiskLevel(score: number): string {
    if (score >= 70) return "Low Risk";
    if (score >= 40) return "Medium Risk";
    return "High Risk";
  }

  private getRecommendation(score: number): string {
    if (score >= 70) return "Highly Likely";
    if (score >= 40) return "Likely";
    return "Unlikely";
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