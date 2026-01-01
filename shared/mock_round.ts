import { db } from "../server/db";
import { users, subjects, subjectPreferences, roundMetadata, allocations } from "./schema";
import { eq } from "drizzle-orm";

async function runMockRound() {
  console.log("--- Starting Mock Allotment Round ---");

  // 1. Reset everything first
  console.log("Step 1: Resetting system...");
  await db.delete(allocations);
  await db.delete(subjectPreferences);
  await db.delete(roundMetadata);

  // 2. Setup Round
  console.log("Step 2: Creating active counseling round...");
  const [round] = await db.insert(roundMetadata).values({
    roundId: "mock-round-1",
    semesterYear: "Jan-Jun-2026",
    roundNumber: 1,
    status: "active",
    startTime: new Date(),
    endTime: new Date(Date.now() + 86400000), // 1 day later
  }).returning();

  // 3. Get Faculty
  const facultyList = await db.select().from(users).where(eq(users.role, "faculty"));
  const allSubjects = await db.select().from(subjects);

  if (facultyList.length < 5 || allSubjects.length < 10) {
    console.error("Not enough faculty or subjects in DB. Please run seed first.");
    return;
  }

  // 4. Create Mock Preferences
  console.log("Step 3: Creating mock preferences for faculty...");
  // Sort faculty by seniority for simulation
  const sortedFaculty = [...facultyList].sort((a, b) => (a.seniority || 99) - (b.seniority || 99));

  for (let i = 0; i < sortedFaculty.length; i++) {
    const f = sortedFaculty[i];
    // Pick 3 random subjects as preferences
    const shuffled = [...allSubjects].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    await db.insert(subjectPreferences).values(
      selected.map((s, idx) => ({
        userId: f.id,
        subjectId: s.id,
        rank: idx + 1,
      }))
    );
    console.log(`  - Faculty ${f.name} (Seniority ${f.seniority}) selected: ${selected.map(s => s.code).join(", ")}`);
  }

  // 5. Run Allotment (Simulating server logic)
  console.log("\nStep 4: Running allotment algorithm...");
  const subjectAvailability = new Map(allSubjects.map(s => [s.id, 1]));
  const finalAllocations = [];

  for (const faculty of sortedFaculty) {
    const prefs = await db.select().from(subjectPreferences)
      .where(eq(subjectPreferences.userId, faculty.id))
      .orderBy(subjectPreferences.rank);

    for (const pref of prefs) {
      if (subjectAvailability.get(pref.subjectId)! > 0) {
        finalAllocations.push({
          userId: faculty.id,
          subjectId: pref.subjectId,
        });
        subjectAvailability.set(pref.subjectId, 0); // Subject taken
        const sub = allSubjects.find(s => s.id === pref.subjectId);
        console.log(`  ✅ Allotted ${sub?.code} to ${faculty.name}`);
        break;
      } else {
        const sub = allSubjects.find(s => s.id === pref.subjectId);
        console.log(`  ❌ ${sub?.code} already taken, checking next preference for ${faculty.name}...`);
      }
    }
  }

  // 6. Save Results
  console.log("\nStep 5: Saving allocations to database...");
  if (finalAllocations.length > 0) {
    await db.insert(allocations).values(finalAllocations);
  }
  await db.update(roundMetadata)
    .set({ status: "completed" })
    .where(eq(roundMetadata.id, round.id));

  console.log(`\n--- Mock Round Complete ---`);
  console.log(`Total Faculty Processed: ${sortedFaculty.length}`);
  console.log(`Total Successful Allotments: ${finalAllocations.length}`);
}

runMockRound().catch(console.error).finally(() => process.exit());
