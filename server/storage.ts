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
  type User, 
  type InsertUser,
  type Subject,
  type Allocation,
  type InsertAllocation,
  type SubjectHistory,
  type FacultyLoadHistory,
  type SubjectPreference,
  type RoundMetadata
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

  // Round operations
  getActiveRound(): Promise<RoundMetadata | undefined>;
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

  async calculateSubjectProbabilities(userId: string): Promise<any[]> {
    // Get all subjects
    const allSubjects = await this.getAllSubjects();
    
    // Get all history to compare with other faculty (seniority/overlap)
    const allHistory = await this.getSubjectHistory();
    const facultyHistory = allHistory.filter(h => h.facultyId === userId);
    const loadHistory = await this.getFacultyLoadHistory(userId);
    
    // Get most recent semester load
    const previousLoad = loadHistory.sort((a, b) => 
      new Date(b.semesterYear).getTime() - new Date(a.semesterYear).getTime()
    )[0];

    // Calculate probability for each subject
    return allSubjects.map(subject => {
      let score = 0;

      // 1. Individual Historical Frequency (0-40 points)
      // High priority if taught frequently by this specific faculty
      const individualCount = facultyHistory.filter(h => h.code === subject.code).length;
      if (individualCount >= 2) score += 40;
      else if (individualCount === 1) score += 25;

      // 2. Global Seniority/Overlap Penalty (0 to -30 points)
      // If many other (potentially senior) faculty have taught this, probability decreases
      const uniqueOthers = new Set(allHistory.filter(h => h.code === subject.code && h.facultyId !== userId).map(h => h.facultyId)).size;
      
      if (uniqueOthers > 2) score -= 20; // Highly contested
      else if (uniqueOthers > 0) score -= 10; // Some competition

      // 3. Load Balancing (0-30 points)
      if (previousLoad) {
        if (previousLoad.totalCredits < 8) score += 30; // Light load
        else if (previousLoad.totalCredits < 12) score += 15; // Medium
      } else {
        score += 20; // Default for new faculty or missing data
      }

      // 4. Subject Affinity/Specialization (0-30 points)
      const primarySpec = previousLoad?.primarySpecialization;
      const subjectCategory = this.extractCategory(subject.name);
      
      if (primarySpec === subjectCategory) score += 30;
      else if (facultyHistory.some(h => h.category === subjectCategory)) score += 15;

      // Ensure score is within 0-100
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
}

export const storage = new DatabaseStorage();
