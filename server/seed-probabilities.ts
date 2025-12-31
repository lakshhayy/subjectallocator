// Seed script to load historical timetable data for probability calculations
import { db } from "./db";
import { subjectHistory, facultyLoadHistory, users } from "@shared/schema";

async function seedProbabilityData() {
  try {
    console.log("Seeding probability data...");

    // Get actual faculty from database
    const faculties = await db.select().from(users);
    const facultyMap: Record<string, string> = {};
    
    faculties.forEach((f: any) => {
      if (f.username === "mchawla") facultyMap["mchawla"] = f.id;
      if (f.username === "nkhare") facultyMap["nkhare"] = f.id;
      if (f.username === "rkpateriya") facultyMap["rkpateriya"] = f.id;
      if (f.username === "dstomar") facultyMap["dstomar"] = f.id;
    });

    console.log("Faculty mapping:", facultyMap);

    // Historical data from July-Dec 2025 timetable
    const julyDecData = [
      // Prof. Meenu Chawla
      {
        facultyId: facultyMap["mchawla"],
        code: "FAC24511",
        name: "Advanced Data Structures",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "DataStructures",
      },
      {
        facultyId: facultyMap["mchawla"],
        code: "FAC24514",
        name: "Advanced Data Structures Lab",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 0,
        creditsLab: 6,
        subjectType: "Lab",
        category: "DataStructures",
      },
      // Prof. Nilay Khare
      {
        facultyId: facultyMap["nkhare"],
        code: "CSE 312",
        name: "Compiler Design",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "Compilers",
      },
      {
        facultyId: facultyMap["nkhare"],
        code: "CSE 313",
        name: "Computer Networks",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 3,
        creditsLab: 4,
        subjectType: "Theory",
        category: "Networks",
      },
      // Prof. R.K. Pateriya
      {
        facultyId: facultyMap["rkpateriya"],
        code: "CSE 411",
        name: "Data Warehousing and Mining",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "Databases",
      },
      {
        facultyId: facultyMap["rkpateriya"],
        code: "CAI AI 1101",
        name: "Machine Learning and Deep Learning",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 2,
        creditsLab: 4,
        subjectType: "Theory",
        category: "ML",
      },
      // Prof. Deepak Singh Tomar
      {
        facultyId: facultyMap["dstomar"],
        code: "CSE 24212",
        name: "Database Management System",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "Databases",
      },
      {
        facultyId: facultyMap["dstomar"],
        code: "CSE 24216",
        name: "Database Management System Lab",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 0,
        creditsLab: 4,
        subjectType: "Lab",
        category: "Databases",
      },
      {
        facultyId: facultyMap["dstomar"],
        code: "FIS 24560",
        name: "Ethical Hacking",
        semesterYear: "Jul-Dec-2025",
        creditsTheory: 2,
        creditsLab: 0,
        subjectType: "Theory",
        category: "Security",
      },
    ];

    // Historical data from Jan-Jun 2025 timetable
    const janJunData = [
      // Prof. Meenu Chawla
      {
        facultyId: facultyMap["mchawla"],
        code: "CSE 357",
        name: "Advanced Data Structures",
        semesterYear: "Jan-Jun-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "DataStructures",
      },
      {
        facultyId: facultyMap["mchawla"],
        code: "FAC 514",
        name: "Core Subject Lab",
        semesterYear: "Jan-Jun-2025",
        creditsTheory: 0,
        creditsLab: 8,
        subjectType: "Lab",
        category: "DataStructures",
      },
      // Prof. Nilay Khare
      {
        facultyId: facultyMap["nkhare"],
        code: "CSE 357",
        name: "Advanced Data Structure",
        semesterYear: "Jan-Jun-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "DataStructures",
      },
      {
        facultyId: facultyMap["nkhare"],
        code: "CSE 223",
        name: "Theory of Computation",
        semesterYear: "Jan-Jun-2025",
        creditsTheory: 3,
        creditsLab: 4,
        subjectType: "Theory",
        category: "Compilers",
      },
      // Prof. R.K. Pateriya
      {
        facultyId: facultyMap["rkpateriya"],
        code: "CSE 321",
        name: "Machine Learning",
        semesterYear: "Jan-Jun-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "ML",
      },
      {
        facultyId: facultyMap["rkpateriya"],
        code: "CSE 324",
        name: "Machine Learning Lab",
        semesterYear: "Jan-Jun-2025",
        creditsTheory: 0,
        creditsLab: 8,
        subjectType: "Lab",
        category: "ML",
      },
      // Prof. Deepak Singh Tomar
      {
        facultyId: facultyMap["dstomar"],
        code: "CSE 323",
        name: "Network & System Securities",
        semesterYear: "Jan-Jun-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "Security",
      },
      {
        facultyId: facultyMap["dstomar"],
        code: "FIS 522",
        name: "Digital Forensics",
        semesterYear: "Jan-Jun-2025",
        creditsTheory: 3,
        creditsLab: 0,
        subjectType: "Theory",
        category: "Security",
      },
    ];

    // Filter out entries with undefined faculty IDs
    const allHistoryData = [...julyDecData, ...janJunData].filter((h: any) => h.facultyId);

    if (allHistoryData.length > 0) {
      await db
        .insert(subjectHistory)
        .values(
          allHistoryData.map((h: any) => ({
            code: h.code,
            name: h.name,
            semesterYear: h.semesterYear,
            facultyId: h.facultyId,
            creditsTheory: h.creditsTheory,
            creditsLab: h.creditsLab,
            subjectType: h.subjectType,
            category: h.category,
          }))
        )
        .onConflictDoNothing();

      console.log(`✓ Inserted ${allHistoryData.length} subject history records`);
    }

    // Insert faculty load history
    const loadData = [
      // Jul-Dec 2025
      { facultyId: facultyMap["mchawla"], semesterYear: "Jul-Dec-2025", totalCredits: 9, numberOfSubjects: 2, primarySpecialization: "DataStructures" },
      { facultyId: facultyMap["nkhare"], semesterYear: "Jul-Dec-2025", totalCredits: 10, numberOfSubjects: 2, primarySpecialization: "Networks" },
      { facultyId: facultyMap["rkpateriya"], semesterYear: "Jul-Dec-2025", totalCredits: 9, numberOfSubjects: 2, primarySpecialization: "ML" },
      { facultyId: facultyMap["dstomar"], semesterYear: "Jul-Dec-2025", totalCredits: 10, numberOfSubjects: 3, primarySpecialization: "Databases" },
      // Jan-Jun 2025
      { facultyId: facultyMap["mchawla"], semesterYear: "Jan-Jun-2025", totalCredits: 11, numberOfSubjects: 2, primarySpecialization: "DataStructures" },
      { facultyId: facultyMap["nkhare"], semesterYear: "Jan-Jun-2025", totalCredits: 7, numberOfSubjects: 2, primarySpecialization: "Networks" },
      { facultyId: facultyMap["rkpateriya"], semesterYear: "Jan-Jun-2025", totalCredits: 11, numberOfSubjects: 2, primarySpecialization: "ML" },
      { facultyId: facultyMap["dstomar"], semesterYear: "Jan-Jun-2025", totalCredits: 6, numberOfSubjects: 2, primarySpecialization: "Security" },
    ].filter((l: any) => l.facultyId);

    if (loadData.length > 0) {
      await db
        .insert(facultyLoadHistory)
        .values(loadData)
        .onConflictDoNothing();

      console.log(`✓ Inserted ${loadData.length} faculty load history records`);
    }
    
    console.log("Probability data seeded successfully!");
  } catch (error) {
    console.error("Error seeding probability data:", error);
    process.exit(1);
  }
}

seedProbabilityData();
