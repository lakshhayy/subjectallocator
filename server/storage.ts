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
  updateFacultyLoad(id: string, maxLoad: number, labLoad?: number): Promise<void>; // Updated signature

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

  // NEW: Lab Allocation Logic
  runLabAlgorithm(): Promise<{ allocatedCount: number; messages: string[] }>;

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

  async updateFacultyLoad(id: string, maxLoad: number, labLoad?: number): Promise<void> {
    const updates: any = { maxLoad };
    if (labLoad !== undefined) updates.labLoad = labLoad;

    await db.update(users)
      .set(updates)
      .where(eq(users.id, id));
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
    // Only counts theory subjects for the main limit
    const result = await db
      .select()
      .from(allocations)
      .where(and(eq(allocations.userId, userId), eq(allocations.role, "theory")));
    return result.length;
  }

  // ============================================
  //   LAB ALLOCATION ALGORITHM (Your Approach)
  // ============================================
  async runLabAlgorithm(): Promise<{ allocatedCount: number; messages: string[] }> {
    const messages: string[] = [];
    const newAllocations: InsertAllocation[] = [];

    // 1. Fetch Data
    const allFaculty = await this.getAllFaculty();
    const allSubjects = await this.getAllSubjects();
    const theoryAllocations = await db.select().from(allocations).where(eq(allocations.role, "theory"));

    // Maps
    const facultyMap = new Map(allFaculty.map(f => [f.id, f]));
    const subjectMap = new Map(allSubjects.map(s => [s.id, s]));

    // Tracking Workload
    interface Workload {
      userId: string;
      coordinatorCount: number;
      coTeacherCount: number;
      totalLabs: number;
    }
    const workloadMap = new Map<string, Workload>();
    allFaculty.forEach(f => workloadMap.set(f.id, { 
      userId: f.id, coordinatorCount: 0, coTeacherCount: 0, totalLabs: 0 
    }));

    // Helper to track section usage
    const labUsage = new Map<string, { [section: number]: { coord: string | null, coTeachers: string[] } }>();

    const getLabUsage = (subjectId: string, section: number) => {
      if (!labUsage.has(subjectId)) labUsage.set(subjectId, {});
      const subjectUsage = labUsage.get(subjectId)!;
      if (!subjectUsage[section]) subjectUsage[section] = { coord: null, coTeachers: [] };
      return subjectUsage[section];
    };

    // Helper to add allocation (in-memory)
    const assign = (userId: string, subjectId: string, section: number, role: 'coordinator' | 'co_teacher') => {
      const w = workloadMap.get(userId)!;
      const usage = getLabUsage(subjectId, section);

      // Validation Limits
      if (role === 'coordinator' && usage.coord) return false; // Already has coord
      if (role === 'co_teacher' && usage.coTeachers.length >= 3) return false; // Max 3 co-teachers
      if (role === 'coordinator' && w.coordinatorCount >= 1) return false; // Max 1 coord role per faculty
      if (w.totalLabs >= (facultyMap.get(userId)?.labLoad || 3)) return false; // Met individual quota

      // Apply
      newAllocations.push({ userId, subjectId, section, role, roundNumber: 99 }); // 99 indicates System Auto
      w.totalLabs++;
      if (role === 'coordinator') {
        w.coordinatorCount++;
        usage.coord = userId;
      } else {
        w.coTeacherCount++;
        usage.coTeachers.push(userId);
      }
      return true;
    };

    // ---------------------------------------------------------
    // PHASE 1: Mandatory Coordinators (Linked to Theory)
    // ---------------------------------------------------------
    for (const alloc of theoryAllocations) {
      const theorySubject = subjectMap.get(alloc.subjectId);
      if (!theorySubject) continue;

      // Find Linked Lab
      const labSubject = allSubjects.find(s => s.relatedTheoryId === theorySubject.id && s.isLab);

      if (labSubject) {
        const userId = alloc.userId;
        // Logic: Teacher gets subject -> Must be Coordinator of Linked Lab (Section 1)
        // Conflict check: If already Coordinator elsewhere, assign as Co-teacher instead
        const w = workloadMap.get(userId)!;

        if (w.coordinatorCount === 0) {
          const success = assign(userId, labSubject.id, 1, 'coordinator');
          if (success) messages.push(`Assigned ${facultyMap.get(userId)?.username} as Coordinator for ${labSubject.code} (Linked)`);
        } else {
          const success = assign(userId, labSubject.id, 1, 'co_teacher');
          if (success) messages.push(`Assigned ${facultyMap.get(userId)?.username} as Co-teacher for ${labSubject.code} (Linked - already coord)`);
        }
      }
    }

    // ---------------------------------------------------------
    // PHASE 2: Fill Remaining Quota with Co-teacher Roles (Same Subject Priority)
    // ---------------------------------------------------------
    for (const faculty of allFaculty) {
      const w = workloadMap.get(faculty.id)!;
      if (w.totalLabs >= faculty.labLoad) continue;

      // Find labs they are already assigned to
      const currentLabIds = newAllocations
        .filter(a => a.userId === faculty.id)
        .map(a => a.subjectId);

      for (const labId of currentLabIds) {
        if (w.totalLabs >= faculty.labLoad) break;

        const labSubject = subjectMap.get(labId)!;
        // Try other sections (2, 3...)
        for (let sec = 1; sec <= (labSubject.sections || 3); sec++) {
          // Skip if already in this section
          const inThisSection = newAllocations.some(a => a.userId === faculty.id && a.subjectId === labId && a.section === sec);
          if (inThisSection) continue;

          const success = assign(faculty.id, labId, sec, 'co_teacher');
          if (success) messages.push(`Assigned ${faculty.username} as Co-teacher for ${labSubject.code} Section ${sec} (Fill quota)`);
          if (w.totalLabs >= faculty.labLoad) break;
        }
      }
    }

    // ---------------------------------------------------------
    // PHASE 3: Preferences for Remaining Unfilled Quotas (Non-Lab Faculty)
    // ---------------------------------------------------------
    // Sort faculty by remaining need (descending)
    const needyFaculty = allFaculty.filter(f => workloadMap.get(f.id)!.totalLabs < f.labLoad);

    for (const faculty of needyFaculty) {
      const w = workloadMap.get(faculty.id)!;
      const prefs = await this.getUserPreferences(faculty.id); // Get their prefs

      // Filter only Lab subjects from prefs
      const labPrefs = prefs.filter(p => p.subject.isLab);

      for (const pref of labPrefs) {
        if (w.totalLabs >= faculty.labLoad) break;

        const labSubject = pref.subject;
        const totalSections = labSubject.sections || 3;

        for (let sec = 1; sec <= totalSections; sec++) {
           if (w.totalLabs >= faculty.labLoad) break;

           // Can they be Coordinator? (Priority)
           if (w.coordinatorCount === 0) {
             const success = assign(faculty.id, labSubject.id, sec, 'coordinator');
             if (success) {
               messages.push(`Assigned ${faculty.username} as Coordinator for ${labSubject.code} Section ${sec} (Preference)`);
               continue; // Move to next pref or next section
             }
           }

           // Else Co-teacher
           const success = assign(faculty.id, labSubject.id, sec, 'co_teacher');
           if (success) messages.push(`Assigned ${faculty.username} as Co-teacher for ${labSubject.code} Section ${sec} (Preference)`);
        }
      }
    }

    // 4. Commit to DB
    if (newAllocations.length > 0) {
      // First, remove existing lab allocations to avoid conflicts if re-running
      // This is a "clean slate" for labs approach
      await db.delete(allocations).where(sql`${allocations.role} IN ('coordinator', 'co_teacher')`);

      await db.insert(allocations).values(newAllocations);
    }

    return { allocatedCount: newAllocations.length, messages };
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