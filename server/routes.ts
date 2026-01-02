import type { Express } from "express";
import { createServer, type Server } from "http";
import { users, subjects, allocations, roundMetadata } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storage } from "./storage";
import { z } from "zod";
import { db } from "./db";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============ AUTH ROUTES ============
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string(),
      });

      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.user = user;

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user;
      
      return res.json({ user: userWithoutPassword });
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

  // ============ SUBJECT ROUTES ============
  
  // Get all subjects
  app.get("/api/subjects", requireAuth, async (req, res) => {
    try {
      const subjects = await storage.getAllSubjects();
      const filteredSubjects = subjects.filter(s => s.semester > 2);
      return res.json(filteredSubjects);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get subjects by semester
  app.get("/api/subjects/semester/:semester", requireAuth, async (req, res) => {
    try {
      const semester = parseInt(req.params.semester);
      const subjects = await storage.getSubjectsBySemester(semester);
      return res.json(subjects);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Admin: Create new subject
  app.post("/api/admin/subjects", requireAdmin, async (req, res) => {
    try {
      const subjectSchema = z.object({
        code: z.string(),
        name: z.string(),
        semester: z.number().int(),
        type: z.string(),
        credits: z.number().int(),
        description: z.string(),
      });

      const data = subjectSchema.parse(req.body);
      const subject = await storage.createSubject(data);
      return res.json(subject);
    } catch (error) {
      return res.status(400).json({ message: "Failed to create subject" });
    }
  });

  // Admin: Update subject
  app.put("/api/admin/subjects/:id", requireAdmin, async (req, res) => {
    try {
      const subjectSchema = z.object({
        code: z.string().optional(),
        name: z.string().optional(),
        semester: z.number().int().optional(),
        type: z.string().optional(),
        credits: z.number().int().optional(),
        description: z.string().optional(),
      });

      const data = subjectSchema.parse(req.body);
      const subject = await storage.updateSubject(req.params.id, data);
      return res.json(subject);
    } catch (error) {
      return res.status(400).json({ message: "Failed to update subject" });
    }
  });

  // Admin: Delete subject
  app.delete("/api/admin/subjects/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSubject(req.params.id);
      return res.json({ message: "Subject deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // ============ PREFERENCE ROUTES ============
  
  // Get user's ranked preferences
  app.get("/api/preferences", requireAuth, async (req, res) => {
    try {
      const preferences = await storage.getUserPreferences(req.session.userId!);
      return res.json(preferences);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // Save ranked preferences
  app.post("/api/preferences", requireAuth, async (req, res) => {
    try {
      const prefSchema = z.array(z.object({
        subjectId: z.string(),
        rank: z.number().int().positive()
      }));

      const prefs = prefSchema.parse(req.body);
      
      if (prefs.length < 3) {
        return res.status(400).json({ message: "Minimum 3 subjects required in preference list" });
      }

      await storage.savePreferences(req.session.userId!, prefs);
      return res.json({ message: "Preferences saved successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Invalid preferences data" });
    }
  });

  // ============ ALLOCATION ROUTES ============
  
  // Admin: Reset rounds and allocations
  app.post("/api/admin/reset-system", requireAdmin, async (req, res) => {
    try {
      await storage.resetAllSelections();
      return res.json({ message: "System reset successfully. All preferences and allotments cleared." });
    } catch (error) {
      return res.status(500).json({ message: "Failed to reset system" });
    }
  });

  // Admin: Delete specific allocation
  app.delete("/api/admin/allocations/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAllocation(req.params.id);
      return res.json({ message: "Allocation removed by admin" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to remove allocation" });
    }
  });

  // Admin: Manual Allotment Override
  app.post("/api/admin/manual-allot", requireAdmin, async (req, res) => {
    try {
      const { userId, subjectId } = z.object({ userId: z.string(), subjectId: z.string() }).parse(req.body);
      await storage.createAllocation({ userId, subjectId });
      return res.json({ message: "Manual allotment successful" });
    } catch (error) {
      return res.status(400).json({ message: "Failed to create manual allotment" });
    }
  });
  // Admin: Run Allotment Algorithm (2-Round Counseling)
  app.post("/api/admin/run-allotment", requireAdmin, async (req, res) => {
    try {
      const activeRound = await storage.getActiveRound();
      if (!activeRound) {
        return res.status(400).json({ message: "No active counseling round found" });
      }

      const allUsers = await db.select().from(users);
      const allSubjects = await storage.getAllSubjects();
      
      // Get existing allocations to identify what's already taken
      const existingAllocations = await storage.getAllAllocations();
      const alreadyAllottedSubjectIds = new Set(existingAllocations.map(a => a.subject.id));
      
      // Faculty who already have an allocation in Round 1
      const alreadyAllottedFacultyIds = new Set(existingAllocations.map(a => a.user.id));

      // JAC/JOSAA style: Sort faculty by seniority (lower number = more senior)
      const sortedFaculty = allUsers
        .filter(u => u.role === "faculty")
        .sort((a, b) => {
          const seniorityA = Number(a.seniority) || 999;
          const seniorityB = Number(b.seniority) || 999;
          return seniorityA - seniorityB;
        });

      const newAllocations: any[] = [];
      const subjectAvailability = new Map(allSubjects.map(s => [s.id, alreadyAllottedSubjectIds.has(s.id) ? 0 : 1]));

      // ROUND LOGIC: 
      // If we are in Round 1 (no allocations yet), everyone gets 1 subject.
      // If we are in Round 2 (allocations exist), everyone gets their 2nd subject from remaining.
      
      const isRound2 = existingAllocations.length > 0;
      console.log(`Running Allotment - Mode: ${isRound2 ? "Round 2" : "Round 1"}`);

      for (const faculty of sortedFaculty) {
        // Skip if faculty already reached limit (though here it's 1 per round)
        const currentCount = existingAllocations.filter(a => a.user.id === faculty.id).length;
        if (currentCount >= 2) continue;

        const prefs = await storage.getUserPreferences(faculty.id);
        
        // Try to allot in rank order
        for (const pref of prefs) {
          // Subject must be available AND not already allotted to THIS specific faculty
          const isSubjectTakenByFaculty = existingAllocations.some(a => a.user.id === faculty.id && a.subject.id === pref.subjectId);
          
          if (subjectAvailability.get(pref.subjectId)! > 0 && !isSubjectTakenByFaculty) {
            newAllocations.push({
              userId: faculty.id,
              subjectId: pref.subjectId,
            });
            subjectAvailability.set(pref.subjectId, 0); // Subject taken
            break; 
          }
        }
      }

      // Save new allocations
      await db.transaction(async (tx) => {
        if (newAllocations.length > 0) {
          await tx.insert(allocations).values(newAllocations);
        }
        
        // If this was the start (Round 1), we might keep the round active for Round 2
        // If we want it to be a 2-step process triggered by admin:
        // We'll update the round metadata status based on whether it's the final round
        if (isRound2 || newAllocations.length === 0) {
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

  // Get user's allocations
  app.get("/api/allocations/my", requireAuth, async (req, res) => {
    try {
      const allocations = await storage.getUserAllocations(req.session.userId!);
      return res.json(allocations);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  // Create allocation
  app.post("/api/allocations", requireAuth, async (req, res) => {
    try {
      const allocationSchema = z.object({
        subjectId: z.string(),
      });

      const { subjectId } = allocationSchema.parse(req.body);
      const userId = req.session.userId!;

      // Verify subject exists
      const subject = await storage.getSubjectById(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Check if user already has 3 allocations
      const currentCount = await storage.checkAllocationLimit(userId);
      if (currentCount >= 3) {
        return res.status(400).json({ message: "You can only select up to 3 subjects" });
      }

      // Create allocation (unique constraint will prevent duplicates)
      const allocation = await storage.createAllocation({ userId, subjectId });
      
      return res.json(allocation);
    } catch (error: any) {
      // Handle unique constraint violation
      if (error?.code === "23505" || error?.message?.includes("duplicate")) {
        return res.status(400).json({ message: "You have already selected this subject" });
      }
      return res.status(400).json({ message: "Failed to create allocation" });
    }
  });

  // Delete allocation
  app.delete("/api/allocations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAllocation(id);
      return res.json({ message: "Allocation deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete allocation" });
    }
  });

  // ============ PROBABILITY ROUTES ============
  
  // Get probability scores for subjects
  app.get("/api/subjects/probabilities", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const probabilities = await storage.calculateSubjectProbabilities(userId);
      
      // Sort by probability (highest first)
      probabilities.sort((a: any, b: any) => b.probabilityScore - a.probabilityScore);
      
      return res.json(probabilities);
    } catch (error) {
      console.error("Error calculating probabilities:", error);
      return res.status(500).json({ message: "Failed to calculate probabilities" });
    }
  });

  // ============ ADMIN ROUTES ============
  
  // Get all allocations with user and subject details (Admin only)
  app.get("/api/admin/allocations", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allocations = await storage.getAllAllocations();
      return res.json(allocations);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  // Get analytics (Admin only)
  app.get("/api/admin/analytics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const [subjects, allocationsData] = await Promise.all([
        storage.getAllSubjects(),
        storage.getAllAllocations(),
      ]);

      const rawAllocations = await (storage as any).getRawAllocations?.() || [];

      // Calculate statistics
      const totalSubjects = subjects.length;
      const totalAllocations = allocationsData.length;
      
      // Get all faculty preferences for the admin to see live selections
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

      // Count unique faculty who have submitted preferences
      const facultyWithPreferences = facultyPreferences.filter(fp => fp.preferences.length > 0).length;
      const totalPreferenceCount = facultyPreferences.reduce((acc, fp) => acc + fp.preferences.length, 0);

      // Group allocations by faculty
      const facultyAllocations = allocationsData.reduce((acc: any, allocation) => {
        const facultyId = allocation.user.id;
        if (!acc[facultyId]) {
          acc[facultyId] = {
            user: allocation.user,
            subjects: [],
          };
        }
        acc[facultyId].subjects.push(allocation.subject);
        return acc;
      }, {});

      // Group allocations by subject
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

      // Calculate unallocated subjects count correctly
      const allocatedSubjectIds = new Set(allocationsData.map(a => a.subject.id));
      const unallocatedSubjects = subjects.filter(
        subject => !allocatedSubjectIds.has(subject.id)
      ).length;

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
