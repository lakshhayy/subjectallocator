import type { Express } from "express";
import { createServer, type Server } from "http";
import { users, subjects, allocations, roundMetadata } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storage } from "./storage";
import { z } from "zod";
import { db } from "./db";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

// Middleware to check if user is authenticated
function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Middleware to check if user is admin
function requireAdmin(req: any, res: any, next: any) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  next();
}

// Rate Limiter Configuration
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 login requests per window
  message: { message: "Too many login attempts, please try again after 60 seconds." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  keyGenerator: (req) => req.ip || "unknown", 
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ AUTH ROUTES ============

  // Login
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string(),
      });

      const { username, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);

      // Secure Password Comparison
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Session Regeneration
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }

        req.session.userId = user.id;
        req.session.user = user;

        const { password: _, ...userWithoutPassword } = user;

        req.session.save((err) => {
          if (err) {
             return res.status(500).json({ message: "Failed to save session" });
          }
          return res.json({ user: userWithoutPassword });
        });
      });

    } catch (error) {
      return res.status(400).json({ message: "Invalid request" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully" });
    });
  });

  // Check session
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      return res.json({ user: userWithoutPassword });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ============ SYSTEM SETTINGS ROUTES ============

  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      return res.json(settings);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        minPreferences: z.number().min(3).max(20)
      });
      const data = schema.parse(req.body);
      const updated = await storage.updateSystemSettings(data);
      return res.json(updated);
    } catch (error) {
      return res.status(400).json({ message: "Invalid settings" });
    }
  });

  // ============ FACULTY MANAGEMENT ROUTES (ADMIN) ============

  app.get("/api/admin/faculty", requireAdmin, async (req, res) => {
    try {
      const faculty = await storage.getAllFaculty();
      const safeFaculty = faculty.map(f => {
        const { password, ...rest } = f;
        return rest;
      });
      return res.json(safeFaculty);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch faculty list" });
    }
  });

  app.post("/api/admin/faculty", requireAdmin, async (req, res) => {
    try {
      const newUserSchema = z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().min(2),
        imageUrl: z.string().optional(),
        role: z.literal("faculty").default("faculty"),
        seniority: z.number().optional().default(999),
      });

      const data = newUserSchema.parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      const { password, ...safeUser } = user;
      return res.json(safeUser);
    } catch (error) {
      return res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/admin/faculty/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      return res.json({ message: "Faculty member removed" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.put("/api/admin/faculty/seniority", requireAdmin, async (req, res) => {
    try {
      const updateSchema = z.array(z.object({
        id: z.string(),
        seniority: z.number()
      }));

      const updates = updateSchema.parse(req.body);
      await storage.updateFacultySeniority(updates);
      return res.json({ message: "Seniority order updated" });
    } catch (error) {
      return res.status(400).json({ message: "Invalid update data" });
    }
  });

  // ============ SUBJECT ROUTES ============

  app.get("/api/subjects", requireAuth, async (req, res) => {
    try {
      const subjects = await storage.getAllSubjects();
      const filteredSubjects = subjects.filter(s => s.semester >= 1);
      return res.json(filteredSubjects);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.get("/api/subjects/semester/:semester", requireAuth, async (req, res) => {
    try {
      const semester = parseInt(req.params.semester);
      const subjects = await storage.getSubjectsBySemester(semester);
      return res.json(subjects);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.post("/api/admin/subjects", requireAdmin, async (req, res) => {
    try {
      const subjectSchema = z.object({
        code: z.string(),
        name: z.string(),
        semester: z.number().int(),
        type: z.string(),
        credits: z.number().int(),
        description: z.string(),
        sections: z.number().int().min(1).default(1),
        capacity: z.number().int().min(1).default(1),
      });

      const data = subjectSchema.parse(req.body);
      const subject = await storage.createSubject(data);
      return res.json(subject);
    } catch (error) {
      return res.status(400).json({ message: "Failed to create subject" });
    }
  });

  // NEW: BULK UPLOAD SUBJECTS ROUTE
  app.post("/api/admin/subjects/bulk", requireAdmin, async (req, res) => {
    try {
      const bulkSchema = z.array(z.object({
        code: z.string(),
        name: z.string(),
        semester: z.number().int(),
        type: z.string(),
        credits: z.number().int(),
        description: z.string(),
        sections: z.number().int().default(1),
        capacity: z.number().int().default(1),
      }));

      const data = bulkSchema.parse(req.body);
      const created = await storage.createSubjectsBulk(data);
      return res.json({ message: `Successfully added ${created.length} subjects` });
    } catch (error) {
      return res.status(400).json({ message: "Invalid data format or duplicate codes" });
    }
  });

  app.put("/api/admin/subjects/:id", requireAdmin, async (req, res) => {
    try {
      const subjectSchema = z.object({
        code: z.string().optional(),
        name: z.string().optional(),
        semester: z.number().int().optional(),
        type: z.string().optional(),
        credits: z.number().int().optional(),
        description: z.string().optional(),
        sections: z.number().int().min(1).optional(),
        capacity: z.number().int().min(1).optional(),
      });

      const data = subjectSchema.parse(req.body);
      const subject = await storage.updateSubject(req.params.id, data);
      return res.json(subject);
    } catch (error) {
      return res.status(400).json({ message: "Failed to update subject" });
    }
  });

  app.delete("/api/admin/subjects/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSubject(req.params.id);
      return res.json({ message: "Subject deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // ============ PREFERENCE ROUTES ============

  app.get("/api/preferences", requireAuth, async (req, res) => {
    try {
      const preferences = await storage.getUserPreferences(req.session.userId!);
      return res.json(preferences);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post("/api/preferences", requireAuth, async (req, res) => {
    try {
      if (req.session.user?.role === "admin") {
        return res.status(403).json({ message: "Admins cannot select subjects or save preferences." });
      }

      const prefSchema = z.array(z.object({
        subjectId: z.string(),
        rank: z.number().int().positive()
      }));

      const prefs = prefSchema.parse(req.body);
      const settings = await storage.getSystemSettings();
      const minRequired = settings.minPreferences;

      if (prefs.length < minRequired) {
        return res.status(400).json({ 
          message: `To ensure allocation, you must rank at least ${minRequired} subjects.` 
        });
      }

      await storage.savePreferences(req.session.userId!, prefs);
      return res.json({ message: "Preferences saved successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Invalid preferences data" });
    }
  });

  // ============ ALLOCATION ROUTES ============

  app.post("/api/admin/reset-system", requireAdmin, async (req, res) => {
    try {
      await storage.resetAllSelections();
      return res.json({ message: "System reset successfully. All preferences and allotments cleared." });
    } catch (error) {
      return res.status(500).json({ message: "Failed to reset system" });
    }
  });

  app.delete("/api/admin/allocations/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAllocation(req.params.id);
      return res.json({ message: "Allocation removed by admin" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to remove allocation" });
    }
  });

  app.post("/api/admin/run-allotment", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allSubjects = await storage.getAllSubjects();
      const existingAllocations = await storage.getAllAllocations();

      const sortedFaculty = allUsers
        .filter(u => u.role === "faculty")
        .sort((a, b) => {
          const seniorityA = Number(a.seniority) || 999;
          const seniorityB = Number(b.seniority) || 999;

          if (seniorityA !== seniorityB) {
            return seniorityA - seniorityB;
          }
          return a.username.localeCompare(b.username);
        });

      const newAllocations: any[] = [];
      const subjectAvailability = new Map<string, number>();

      allSubjects.forEach(s => {
        const usedSlots = existingAllocations.filter(a => a.subject.id === s.id).length;
        // Use 'sections' as the primary indicator for how many faculty can be assigned
        const cap = s.sections || 1; 
        const remaining = Math.max(0, cap - usedSlots);
        subjectAvailability.set(s.id, remaining);
      });

      const isRound2 = existingAllocations.length > 0;
      console.log(`Running Allotment - Mode: ${isRound2 ? "Round 2" : "Round 1"}`);

      for (const faculty of sortedFaculty) {
        const currentFacultyAllocations = existingAllocations.filter(a => a.user.id === faculty.id);
        const currentCount = currentFacultyAllocations.length;

        if (currentCount >= 2) {
          console.log(`Skipping ${faculty.username}: Already has ${currentCount} subjects.`);
          continue;
        }

        const prefs = await storage.getUserPreferences(faculty.id);

        for (const pref of prefs) {
          const isSubjectTakenByThisFaculty = currentFacultyAllocations.some(a => a.subject.id === pref.subjectId);
          const slotsLeft = subjectAvailability.get(pref.subjectId) || 0;

          if (isSubjectTakenByThisFaculty) continue;
          if (slotsLeft <= 0) continue;

          newAllocations.push({
            userId: faculty.id,
            subjectId: pref.subjectId,
          });

          subjectAvailability.set(pref.subjectId, slotsLeft - 1);
          break; 
        }
      }

      await db.transaction(async (tx) => {
        if (newAllocations.length > 0) {
          await tx.insert(allocations).values(newAllocations);
        }

        const activeRound = await storage.getActiveRound();
        if (activeRound) {
           await tx.update(roundMetadata)
            .set({ status: "completed" })
            .where(eq(roundMetadata.id, activeRound.id));
        }
      });

      return res.json({ 
        message: isRound2 ? "Round 2 completed successfully" : "Round 1 completed successfully", 
        count: newAllocations.length,
        isRound2 
      });
    } catch (error) {
      console.error("Allotment error:", error);
      return res.status(500).json({ message: "Algorithm execution failed" });
    }
  });

  app.get("/api/allocations/my", requireAuth, async (req, res) => {
    try {
      const allocations = await storage.getUserAllocations(req.session.userId!);
      return res.json(allocations);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  app.post("/api/allocations", requireAuth, async (req, res) => {
    try {
      if (req.session.user?.role === "admin") {
        return res.status(403).json({ message: "Admins cannot select subjects." });
      }

      const allocationSchema = z.object({
        subjectId: z.string(),
      });

      const { subjectId } = allocationSchema.parse(req.body);
      const userId = req.session.userId!;

      const subject = await storage.getSubjectById(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      const currentCount = await storage.checkAllocationLimit(userId);
      if (currentCount >= 3) {
        return res.status(400).json({ message: "You can only select up to 3 subjects" });
      }

      const allocation = await storage.createAllocation({ userId, subjectId });

      return res.json(allocation);
    } catch (error: any) {
      if (error?.code === "23505" || error?.message?.includes("duplicate")) {
        return res.status(400).json({ message: "You have already selected this subject" });
      }
      return res.status(400).json({ message: "Failed to create allocation" });
    }
  });

  app.delete("/api/allocations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAllocation(id);
      return res.json({ message: "Allocation deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete allocation" });
    }
  });

  app.get("/api/subjects/probabilities", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const probabilities = await storage.calculateSubjectProbabilities(userId);
      probabilities.sort((a: any, b: any) => b.probabilityScore - a.probabilityScore);
      return res.json(probabilities);
    } catch (error) {
      console.error("Error calculating probabilities:", error);
      return res.status(500).json({ message: "Failed to calculate probabilities" });
    }
  });

  app.get("/api/admin/allocations", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allocations = await storage.getAllAllocations();
      return res.json(allocations);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  app.get("/api/admin/analytics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const [subjects, allocationsData] = await Promise.all([
        storage.getAllSubjects(),
        storage.getAllAllocations(),
      ]);

      const rawAllocations = await (storage as any).getRawAllocations?.() || [];
      const totalSubjects = subjects.length;
      const totalAllocations = allocationsData.length;

      const allFaculty = await db.select().from(users).where(eq(users.role, "faculty"));
      const facultyPreferences = await Promise.all(
        allFaculty.map(async (f) => {
          const prefs = await storage.getUserPreferences(f.id);
          return {
            user: f,
            preferences: prefs.map(p => p.subject)
          };
        })
      );

      const facultyWithPreferences = facultyPreferences.filter(fp => fp.preferences.length > 0).length;
      const totalPreferenceCount = facultyPreferences.reduce((acc, fp) => acc + fp.preferences.length, 0);

      const facultyAllocations = allocationsData.reduce((acc: any, allocation) => {
        const facultyId = allocation.user.id;
        if (!acc[facultyId]) {
          acc[facultyId] = {
            user: allocation.user,
            subjects: [],
          };
        }
        acc[facultyId].subjects.push({
          ...allocation.subject,
          allocationId: allocation.id
        });
        return acc;
      }, {});

      const subjectAllocations = allocationsData.reduce((acc: any, allocation) => {
        const subjectId = allocation.subject.id;
        if (!acc[subjectId]) {
          acc[subjectId] = {
            subject: allocation.subject,
            faculty: [],
          };
        }
        acc[subjectId].faculty.push(allocation.user);
        return acc;
      }, {});

      const unallocatedSubjects = subjects.filter(subject => {
        const used = allocationsData.filter(a => a.subject.id === subject.id).length;
        const cap = subject.sections || 1;
        return used < cap;
      }).length;

      return res.json({
        totalSubjects,
        totalAllocations,
        totalFaculty: facultyWithPreferences,
        totalPreferences: totalPreferenceCount,
        unallocatedSubjects,
        facultyAllocations: Object.values(facultyAllocations),
        subjectAllocations: Object.values(subjectAllocations),
        facultyPreferences,
        rawAllocations,
      });
    } catch (error) {
      console.error("Analytics Error:", error);
      return res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}