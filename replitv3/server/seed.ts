import { db } from "./db";
import { users, subjects, roundMetadata } from "@shared/schema";
import { subjects as subjectsData } from "../client/src/lib/mock-data";
import { facultyUsers } from "../client/src/lib/users";

async function seed() {
  try {
    console.log("Seeding database...");

    // Seed users (faculty + admin)
    const usersToInsert = [
      ...facultyUsers.map((user: { username: string; password: string; name: string; seniority?: number }) => ({
        username: user.username,
        password: user.password, // In production, hash these!
        name: user.name,
        role: "faculty" as const,
        seniority: user.seniority || 99,
      })),
      {
        username: "admin",
        password: "admin123",
        name: "System Administrator",
        role: "admin" as const,
        seniority: 0,
      }
    ];

    await db.insert(users).values(usersToInsert).onConflictDoNothing();
    console.log(`✓ Inserted ${usersToInsert.length} users`);

    // Seed subjects
    const subjectsToInsert = subjectsData.map(subject => ({
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
      type: subject.type,
      credits: subject.credits,
      description: subject.description,
    }));

    await db.insert(subjects).values(subjectsToInsert).onConflictDoNothing();
    console.log(`✓ Inserted ${subjectsToInsert.length} subjects`);

    // Initial Round Metadata
    await db.insert(roundMetadata).values({
      roundId: "R1-2025",
      semesterYear: "Jan-Jun 2025",
      roundNumber: 1,
      status: "active",
      startTime: new Date(),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    }).onConflictDoNothing();
    console.log("✓ Inserted initial round metadata");

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
