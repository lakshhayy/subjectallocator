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
      await db.transaction(async (tx) => {
        await tx.delete(allocations);
        await tx.update(roundMetadata).set({ status: "active" });
      });
      return res.json({ message: "System reset successfully. All allotments cleared." });
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
  // Admin: Run Allotment Algorithm (Counseling Round)
  app.post("/api/admin/run-allotment", requireAdmin, async (req, res) => {
    try {
      const activeRound = await storage.getActiveRound();
      if (!activeRound) {
        return res.status(400).json({ message: "No active counseling round found" });
      }

      const allUsers = await db.select().from(users);
      const allSubjects = await storage.getAllSubjects();
      
      // JAC/JOSAA style: Sort faculty by seniority (lower number = more senior)
      const sortedFaculty = allUsers
        .filter(u => u.role === "faculty")
        .sort((a, b) => {
          const seniorityA = Number(a.seniority) || 999;
          const seniorityB = Number(b.seniority) || 999;
          return seniorityA - seniorityB;
        });

      const finalAllocations: any[] = [];
      const subjectAvailability = new Map(allSubjects.map(s => [s.id, 1])); // Simplified: 1 section per subject

      for (const faculty of sortedFaculty) {
        const prefs = await storage.getUserPreferences(faculty.id);
        console.log(`Processing faculty: ${faculty.name} (Seniority: ${faculty.seniority}), Prefs count: ${prefs.length}`);
        
        // Try to allot in rank order
        for (const pref of prefs) {
          if (subjectAvailability.get(pref.subjectId)! > 0) {
            finalAllocations.push({
              userId: faculty.id,
              subjectId: pref.subjectId,
            });
            subjectAvailability.set(pref.subjectId, 0); // Subject taken
            console.log(`Allotted ${pref.subjectId} to ${faculty.name}`);
            break; 
          }
        }
      }

      // Clear old allocations and save new ones
      await db.transaction(async (tx) => {
        // Only delete if we are about to insert or if we want to reset
        await tx.delete(allocations);
        if (finalAllocations.length > 0) {
          await tx.insert(allocations).values(finalAllocations);
        }
        // Mark round as completed
        await tx.update(roundMetadata)
          .set({ status: "completed" })
          .where(eq(roundMetadata.id, activeRound.id));
      });

      return res.json({ message: "Allotment algorithm completed successfully", count: finalAllocations.length });
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

      const totalFaculty = Object.keys(facultyAllocations).length;

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

      const unallocatedSubjects = subjects.filter(
        subject => !subjectAllocations[subject.id]
      ).length;

      return res.json({
        totalSubjects,
        totalAllocations,
        totalFaculty,
        unallocatedSubjects,
        facultyAllocations: Object.values(facultyAllocations),
        subjectAllocations: Object.values(subjectAllocations),
        rawAllocations,
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
