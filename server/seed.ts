import { db } from "./db";
import { users, subjects, roundMetadata } from "@shared/schema";
import { subjects as subjectsData } from "../client/src/lib/mock-data";
import { facultyUsers } from "../client/src/lib/users";
import bcrypt from "bcrypt"; // NEW: Import bcrypt for hashing

async function seed() {
  try {
    console.log("Seeding database...");

    // NEW: Create the Admin password hash
    // "10" is the cost factor (salt rounds), standard for bcrypt
    const adminPasswordHash = await bcrypt.hash("admin123", 10);

    // NEW: Map over faculty users and hash their passwords asynchronously
    // We use Promise.all because bcrypt.hash is an async operation
    const facultyWithHashes = await Promise.all(
      facultyUsers.map(async (user: { username: string; password: string; name: string; seniority?: number }) => ({
        username: user.username,
        password: await bcrypt.hash(user.password, 10), // NEW: Hash the password before saving!
        name: user.name,
        role: "faculty" as const,
        seniority: user.seniority || 99,
      }))
    );

    // Combine hashed faculty and hashed admin into one list
    const usersToInsert = [
      ...facultyWithHashes,
      {
        username: "admin",
        password: adminPasswordHash, // NEW: Use the hashed password here
        name: "System Administrator",
        role: "admin" as const,
        seniority: 0,
      }
    ];

    // Insert users into the database
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
      sections: (subject as any).capacity || 1,
    }));

    await db.insert(subjects).values(subjectsToInsert).onConflictDoNothing();
    console.log(`✓ Inserted ${subjectsToInsert.length} subjects`);

    // Initial Round Metadata (No changes here)
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