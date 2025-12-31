# Subject Allocation with Probability System
## Analysis & Implementation Guide for Round-Based Faculty Selection

---

## PART 1: TIMETABLE ANALYSIS

### July-Dec 2025 Semester Analysis

#### Prof. Meenu Chawla (mchawla)
- **MTech ADS** (Advanced Data Structures) - Theory: 1 slot
- **MTech ADS Lab** (Advanced Data Structures Lab) - Lab: 1 slot  
- **MTech IS Seminar** - Seminar: 1 slot
- **Load**: Low (3 hours theory + 6 lab = 9 credits)
- **Subject Types**: Core MTech (2), Seminar (1)

#### Prof. Nilay Khare (nkhare)
- **CSE 312** (Compiler Design) - B.Tech Sem V: 2 slots
- **CSE 313** (Computer Networks) - B.Tech Sem V: 2 slots
- **FAI24516** (Seminar 1 AI) - MTech: 1 slot
- **FCN24516** (Seminar 1 CN) - MTech: 1 slot
- **Load**: High (6 hours theory + 4 lab = 10 credits)
- **Subject Types**: B.Tech Core (2), MTech Seminar (2)

#### Prof. R.K. Pateriya (HOD, rkpateriya)
- **CSE 411** (Data Warehousing & Mining) - B.Tech Sem VII: 2 slots
- **CSE 412** (DWM Lab) - B.Tech Sem VII: 1 slot
- **CAI AI 1101** (Machine Learning & Deep Learning) - MTech: 2 slots
- **Load**: High (5 hours theory + 4 lab = 9 credits)
- **Subject Types**: B.Tech Core (2), MTech Core (1)

#### Prof. Deepak Singh Tomar (dstomar)
- **CSE 24212** (Database Management System) - B.Tech Sem III: 3 slots
- **CSE 24216** (DBMS Lab) - B.Tech Sem III: 1 slot
- **FIS 24560** (Ethical Hacking) - MTech: 1 slot
- **FIS 24514** (MTech Core Subject Lab) - MTech: 1 slot
- **Load**: High (6 hours theory + 4 lab = 10 credits)
- **Subject Types**: B.Tech Core (2), MTech Core (2)

#### Prof. Vasudev Dehalwar (vdehalwar)
- **CSE 468** (Wireless Networks) - MTech: 2 slots
- **Wireless Networks MTech** - Lab: 1 slot
- **MTech IS Seminar** - Seminar: 1 slot
- **Load**: Medium (4 hours + seminar)
- **Subject Types**: MTech Core (2), Seminar (1)

---

### Jan-June 2025 Semester Analysis

#### Prof. Meenu Chawla (mchawla)
- **CSE 357** (Advanced Data Structures) - B.Tech Sem 4 & 6: 2 slots
- **FAC 514** (Core Subject Lab) - MTech: 1 slot
- **Seminar** (MTech AC): 1 slot
- **Project Based Lab** (B.Tech Sem 4): 1 slot
- **Load**: High (3 hours theory + 8 lab = 11 credits)
- **Subject Types**: B.Tech Core (2), MTech Core (2)

#### Prof. Nilay Khare (nkhare)
- **CSE 357** (Advanced Data Structure) - B.Tech Sem 6: 1 slot
- **CSE 223** (Theory of Computation) - B.Tech Sem 4: 1 slot
- **Seminar AI/CN** - MTech: 1 slot
- **Load**: Medium (3 hours theory + 4 lab = 7 credits)
- **Subject Types**: B.Tech Core (2), MTech Seminar (1)

#### Prof. R.K. Pateriya (HOD, rkpateriya)
- **CSE 321** (Machine Learning) - B.Tech Sem 6: 2 slots
- **CSE 324** (Machine Learning Lab) - B.Tech Sem 6: 2 slots
- **CSE 227** (Project Based Lab) - B.Tech Sem 4: 1 slot
- **Load**: High (3 hours theory + 8 lab = 11 credits)
- **Subject Types**: B.Tech Core (3)

#### Prof. Deepak Singh Tomar (dstomar)
- **CSE 323** (Network & System Securities) - B.Tech Sem 6: 1 slot
- **FIS 522** (Digital Forensics) - MTech Sem 2: 2 slots
- **MTech Core Subject Lab** - MTech: 1 slot
- **Seminar IS** - MTech: 1 slot
- **Load**: Medium (3 hours theory + 5 lab = 8 credits)
- **Subject Types**: B.Tech Core (1), MTech Core (3)

---

## PART 2: SUBJECT POPULARITY & PATTERN ANALYSIS

### Cross-Semester Subject Comparison

#### Frequently Taught Subjects
| Subject | Code | Times in 2 semesters | Faculty Teaching |
|---------|------|-----|---------|
| Advanced Data Structures | CSE 357 / MTech ADS | **2 times** | Meenu Chawla (both), Nilay Khare (Jan) |
| Machine Learning | CAI AI 1101 / CSE 321 | **2 times** | R.K. Pateriya (both) |
| DBMS | CSE 24212 | **1 time** | Deepak Singh Tomar (Jul) |
| Data Warehousing & Mining | CSE 411 | **1 time** | R.K. Pateriya (Jul) |
| Compiler Design | CSE 312 | **1 time** | Nilay Khare (Jul) |
| Computer Networks | CSE 313 / CSE 323 | **2 times** | Nilay Khare (Jul), Deepak Singh Tomar (Jan) |
| Ethical Hacking | FIS 24560 | **1 time** | Deepak Singh Tomar (Jul) |
| Digital Forensics | FIS 522 | **1 time** | Deepak Singh Tomar (Jan) |
| Wireless Networks | CSE 468 | **1 time** | Vasudev Dehalwar (Jul) |
| Theory of Computation | CSE 223 | **1 time** | Nilay Khare (Jan) |

### Faculty Load Pattern
```
July-Dec 2025:
- Meenu Chawla:         9 credits (LIGHT)
- Nilay Khare:          10 credits (HEAVY)
- R.K. Pateriya:        9 credits (MEDIUM)
- Deepak Singh Tomar:   10 credits (HEAVY)
- Vasudev Dehalwar:     7 credits (LIGHT)

Jan-June 2025:
- Meenu Chawla:         11 credits (HEAVY)
- Nilay Khare:          7 credits (LIGHT)
- R.K. Pateriya:        11 credits (HEAVY)
- Deepak Singh Tomar:   8 credits (LIGHT-MEDIUM)
- Vasudev Dehalwar:     [data partial]
```

### Load Balancing Observation
Faculty with light loads in one semester tend to get heavier loads in the next:
- Meenu Chawla: Light (9) → Heavy (11)
- Nilay Khare: Heavy (10) → Light (7)
- Vasudev Dehalwar: Light (7) → [needs full data]

---

## PART 3: PROBABILITY CALCULATION ALGORITHM

### Key Metrics to Track

```typescript
interface SubjectHistory {
  code: string;
  name: string;
  semesters: {
    "Jul-Dec-2025": {
      faculty: string;
      credits: number;
      type: "Theory" | "Lab" | "Seminar" | "Project";
    },
    "Jan-Jun-2025": {
      faculty: string;
      credits: number;
      type: "Theory" | "Lab" | "Seminar" | "Project";
    }
  };
  totalAppearances: number; // Times taught in 2 semesters
}

interface FacultyProfile {
  name: string;
  currentLoad: number; // Credits this semester
  previousLoad: number; // Credits last semester
  preferenceHistory: SubjectCode[]; // Subjects they've taught
  loadTrend: "increasing" | "decreasing" | "stable";
}
```

### Probability Calculation Formula

For each subject, calculate probability a faculty will want it:

```
Probability Score = (Historical Frequency × 0.3) + 
                    (Load Balancing Factor × 0.3) + 
                    (Subject Affinity × 0.2) +
                    (Specialization Match × 0.2)

Where:

1. HISTORICAL FREQUENCY (0-30 points)
   - If taught in both semesters: 30 points
   - If taught in 1 semester: 15 points
   - If never taught: 0 points
   
   Example: Machine Learning
   - R.K. Pateriya taught it in both Jul & Jan = 30 points

2. LOAD BALANCING FACTOR (0-30 points)
   - If faculty had light load last semester: +30 points
   - If faculty had medium load last semester: +15 points
   - If faculty had heavy load last semester: 0 points
   - Credits = Load indicator
   
   Example: Meenu Chawla had 9 credits in Jul (light)
   - Chance to pick heavy load in Jan = 30 points

3. SUBJECT AFFINITY (0-20 points)
   - Faculty's expertise match with subject
   - Based on their teaching history
   
   Example: Nilay Khare teaches Networks topics
   - Network courses: 20 points
   - Database courses: 5 points

4. SPECIALIZATION MATCH (0-20 points)
   - MTech vs B.Tech preference
   - If faculty mainly teaches MTech: 20 points for MTech subjects
   - If faculty mainly teaches B.Tech: 20 points for B.Tech subjects
```

### Example Calculation: Nilay Khare + Machine Learning

```
Subject: Machine Learning (CSE 321)
Faculty: Prof. Nilay Khare

Calculation:
1. Historical Frequency = 0 
   (Nilay has never taught ML; R.K. teaches it)
   
2. Load Balancing = 30
   (Nilay had 10 credits in Jul [heavy] → 10 in Jan [light])
   (Light load → high chance to pick new subject)
   
3. Subject Affinity = 5
   (ML not in Nilay's expertise; they teach networks/compilers)
   
4. Specialization Match = 5
   (Nilay teaches B.Tech; ML can be B.Tech or MTech)

TOTAL = (0 × 0.3) + (30 × 0.3) + (5 × 0.2) + (5 × 0.2)
      = 0 + 9 + 1 + 1
      = 11 points out of 100 (LOW probability)
```

### Example Calculation: R.K. Pateriya + Machine Learning

```
Subject: Machine Learning (CSE 321)
Faculty: Prof. R.K. Pateriya (HOD)

Calculation:
1. Historical Frequency = 30
   (R.K. taught ML in both Jul [CAI AI 1101] and Jan [CSE 321])
   
2. Load Balancing = 0
   (R.K. had 9 credits in Jul [medium], 11 in Jan [heavy])
   (Already has high load; unlikely to pick more)
   
3. Subject Affinity = 20
   (ML is R.K.'s core expertise; taught multiple times)
   
4. Specialization Match = 20
   (R.K. teaches both B.Tech and MTech; ML fits perfectly)

TOTAL = (30 × 0.3) + (0 × 0.3) + (20 × 0.2) + (20 × 0.2)
      = 9 + 0 + 4 + 4
      = 17 points out of 100 (MEDIUM-HIGH probability)
      
But Wait! R.K. is HOD + already has ML in both semesters
→ In a round-based system, R.K. likely won't pick ML again
→ FINAL: LOW-MEDIUM probability (system should account for "already got this")
```

---

## PART 4: DATABASE SCHEMA ADDITIONS

### New Tables Needed

```typescript
// Table 1: Historical Subject Data
export const subjectHistory = pgTable("subject_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(), // CSE 321, CSE 312, etc.
  name: text("name").notNull(), // Machine Learning
  semester: text("semester").notNull(), // "Jul-Dec-2025", "Jan-Jun-2025"
  facultyId: varchar("faculty_id").notNull(),
  creditsTheory: integer("credits_theory").notNull(),
  creditsLab: integer("credits_lab").notNull(),
  subjectType: text("subject_type").notNull(), // "Theory", "Lab", "Seminar", "Project"
});

// Table 2: Faculty Load History (aggregate data)
export const facultyLoadHistory = pgTable("faculty_load_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facultyId: varchar("faculty_id").notNull(),
  semester: text("semester").notNull(),
  totalCredits: integer("total_credits").notNull(),
  numberOfSubjects: integer("number_of_subjects").notNull(),
  specialization: text("specialization"), // "Networks", "ML", "Databases", etc.
});

// Table 3: Allocation Rounds (for tracking selection history)
export const allocationRounds = pgTable("allocation_rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roundNumber: integer("round_number").notNull(), // 1, 2, 3...
  facultyId: varchar("faculty_id").notNull(),
  subjectId: varchar("subject_id").notNull(),
  selectedAt: timestamp("selected_at").notNull().defaultNow(),
  probabilityScore: numeric("probability_score", { precision: 5, scale: 2 }),
});

// Table 4: Subject Availability & Demand
export const subjectDemand = pgTable("subject_demand", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subjectCode: text("subject_code").notNull().unique(),
  semesterYear: text("semester_year").notNull(), // "Jul-Dec-2025", "Jan-Jun-2025"
  totalSlotsAvailable: integer("total_slots_available"),
  demandCount: integer("demand_count").default(0), // How many faculty want it?
  averageProbability: numeric("average_probability"), // Average across all faculty
});
```

---

## PART 5: BACKEND IMPLEMENTATION

### API Endpoint: Calculate Subject Probabilities

```typescript
// GET /api/subjects/probabilities
// Returns: For each subject, probability score for current user

app.get("/api/subjects/probabilities", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  
  try {
    // 1. Get all available subjects
    const subjects = await storage.getAllSubjects();
    
    // 2. Get user's faculty profile (load history, specialization)
    const facultyProfile = await storage.getFacultyProfile(userId);
    
    // 3. Get historical data from past 2 semesters
    const historicalData = await storage.getSubjectHistory();
    
    // 4. Calculate probability for each subject
    const probabilities = subjects.map(subject => {
      const score = calculateProbability(subject, facultyProfile, historicalData);
      
      return {
        ...subject,
        probabilityScore: score,
        probabilityPercentage: Math.round(score),
        riskLevel: getRiskLevel(score), // "Low Risk", "Medium Risk", "High Risk"
        recommendation: getRecommendation(score), // "Highly Likely", "Likely", "Unlikely"
      };
    });
    
    // 5. Sort by probability (highest first)
    probabilities.sort((a, b) => b.probabilityScore - a.probabilityScore);
    
    res.json(probabilities);
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate probabilities" });
  }
});

// Helper function: Calculate probability
function calculateProbability(subject, facultyProfile, historicalData) {
  let score = 0;
  
  // 1. Historical Frequency (30 points max)
  const timesTeaching = historicalData.filter(
    h => h.code === subject.code && h.facultyId === facultyProfile.id
  ).length;
  
  if (timesTeaching === 2) score += 30; // Taught both semesters
  else if (timesTeaching === 1) score += 15; // Taught once
  else score += 0;
  
  // 2. Load Balancing (30 points max)
  const previousLoad = facultyProfile.previousSemesterCredits;
  
  if (previousLoad < 8) score += 30; // Light load → high chance for new/more subjects
  else if (previousLoad < 10) score += 15; // Medium load
  else score += 0; // Heavy load → unlikely to pick more
  
  // 3. Subject Affinity (20 points max)
  const affinityScore = calculateAffinity(subject, facultyProfile, historicalData);
  score += affinityScore;
  
  // 4. Specialization Match (20 points max)
  const specializationScore = calculateSpecialization(subject, facultyProfile);
  score += specializationScore;
  
  // Final normalization (0-100 scale)
  return Math.min(100, Math.max(0, score));
}

// Helper: Calculate subject affinity based on history
function calculateAffinity(subject, facultyProfile, historicalData) {
  const facultySubjects = historicalData
    .filter(h => h.facultyId === facultyProfile.id)
    .map(h => h.code);
  
  // Extract subject category (Networks, ML, Databases, etc.)
  const currentCategory = extractCategory(subject.name);
  
  // Count how many times they taught in this category
  const categoryMatch = facultySubjects.filter(s => 
    extractCategory(getSubjectName(s)) === currentCategory
  ).length;
  
  // 0 matches = 0 points, 1 match = 5 points, 2+ = 20 points
  if (categoryMatch >= 2) return 20;
  else if (categoryMatch === 1) return 5;
  else return 0;
}

// Helper: Extract subject category
function extractCategory(subjectName: string): string {
  if (subjectName.includes("Network")) return "Networks";
  if (subjectName.includes("Machine Learning") || subjectName.includes("AI")) return "ML";
  if (subjectName.includes("Database") || subjectName.includes("DBMS")) return "Databases";
  if (subjectName.includes("Security") || subjectName.includes("Hacking")) return "Security";
  if (subjectName.includes("Compiler")) return "Compilers";
  return "Other";
}
```

---

## PART 6: FRONTEND DISPLAY

### Subject Card with Probability Visualization

```typescript
interface SubjectWithProbability {
  id: string;
  code: string;
  name: string;
  probabilityScore: number; // 0-100
  probabilityPercentage: string; // "75%"
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk";
  recommendation: "Highly Likely" | "Likely" | "Unlikely";
  historicalData?: {
    teachingCount: number;
    lastTaughtBy: string;
    lastSemester: string;
  };
}

// Component: Subject Card with Probability
function SubjectCardWithProbability({ subject }: { subject: SubjectWithProbability }) {
  const getColorClass = (score: number) => {
    if (score >= 70) return "bg-green-100 border-green-500"; // High probability
    if (score >= 40) return "bg-yellow-100 border-yellow-500"; // Medium
    return "bg-red-100 border-red-500"; // Low
  };
  
  const getRiskColor = (risk: string) => {
    if (risk === "Low Risk") return "text-green-600";
    if (risk === "Medium Risk") return "text-yellow-600";
    return "text-red-600";
  };
  
  return (
    <div className={`border-2 rounded-lg p-4 ${getColorClass(subject.probabilityScore)}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{subject.code}</h3>
          <p className="text-sm text-gray-700">{subject.name}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{subject.probabilityPercentage}</div>
          <p className="text-xs text-gray-600">probability</p>
        </div>
      </div>
      
      {/* Probability Bar */}
      <div className="w-full bg-gray-300 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full ${
            subject.probabilityScore >= 70
              ? "bg-green-500"
              : subject.probabilityScore >= 40
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          style={{ width: `${subject.probabilityScore}%` }}
        ></div>
      </div>
      
      {/* Info */}
      <div className="space-y-2 text-sm mb-3">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={`font-semibold ${getRiskColor(subject.riskLevel)}`}>
            {subject.riskLevel}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Recommendation:</span>
          <span className="font-semibold">{subject.recommendation}</span>
        </div>
        {subject.historicalData && (
          <>
            <div className="flex justify-between">
              <span>Times Taught (2 semesters):</span>
              <span>{subject.historicalData.teachingCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Last Taught:</span>
              <span>{subject.historicalData.lastSemester}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Action Button */}
      <button
        onClick={() => selectSubject(subject.id)}
        disabled={subject.probabilityScore < 20}
        className={`w-full py-2 rounded font-semibold transition ${
          subject.probabilityScore >= 70
            ? "bg-green-500 hover:bg-green-600 text-white"
            : subject.probabilityScore >= 40
            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
            : "bg-gray-400 cursor-not-allowed text-gray-600"
        }`}
      >
        {subject.probabilityScore >= 70
          ? "🎯 Highly Recommended"
          : subject.probabilityScore >= 40
          ? "⚠️  Try Your Luck"
          : "❌ Very Unlikely"}
      </button>
      
      {/* Info Tooltip */}
      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
        <p>
          {subject.probabilityScore >= 70
            ? "Based on your history and load, you're likely to get this subject in the next round."
            : subject.probabilityScore >= 40
            ? "There's a moderate chance. Many factors could affect availability."
            : "Based on analysis, this subject is unlikely for you. Consider other options."}
        </p>
      </div>
    </div>
  );
}
```

---

## PART 7: ROUND-BASED SELECTION SYSTEM

### How Rounds Work

```
ALLOCATION ROUNDS:
==================

Round 1: All faculty select simultaneously (within time window)
  ├─ Senior faculty (Professors) select first (if seniority matters)
  └─ Results locked

Round 2: Faculty without allocation select
  └─ If some subjects unfilled, they select

Round 3: Remaining subjects distributed
  └─ Admin manual assignment if needed

SENIORITY ORDER (Based on your earlier data):
=============================================
1. Professor R.K. Pateriya (HOD)          - Highest seniority
2. Professor Meenu Chawla                 - Senior
3. Professor Nilay Khare                  - Senior
4. Professor Deepak Singh Tomar           - Senior
5. Associate Professors (10 people)       - Medium
6. Assistant Professors (14 people)       - Junior


SELECTION FLOW:
===============

1. Round starts → Admin opens allocation portal
2. Faculty receive notification
3. Senior-most faculty selects first
4. Once they select, next faculty can start
5. System shows:
   - Their turn position (#3 of 30)
   - Probability for each available subject
   - What senior faculty selected (so they know availability)
6. Faculty confirms selection
7. Move to next faculty
8. Repeat until all faculty select or time expires
```

### Database Schema for Rounds

```typescript
export const allocationRounds = pgTable("allocation_rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Round Info
  roundId: varchar("round_id").notNull(), // Links all selections in one round
  roundNumber: integer("round_number").notNull(), // 1, 2, 3...
  semesterYear: text("semester_year").notNull(), // "Jan-Jun-2026"
  
  // Faculty Info
  facultyId: varchar("faculty_id").notNull().references(() => users.id),
  seniority: integer("seniority").notNull(), // 1 = most senior, 29 = junior
  turnNumber: integer("turn_number").notNull(), // 1st, 2nd, 3rd... to select
  
  // Selection Info
  subjectId: varchar("subject_id").notNull().references(() => subjects.id),
  probabilityScoreAtSelection: numeric("probability_score", { precision: 5, scale: 2 }),
  selectedAt: timestamp("selected_at").notNull().defaultNow(),
  
  // Status
  status: text("status").notNull(), // "pending", "selected", "assigned", "rejected"
  roundStatus: text("round_status").notNull(), // "active", "completed", "waiting"
});

export const roundMetadata = pgTable("round_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  roundId: varchar("round_id").notNull().unique(),
  semesterYear: text("semester_year").notNull(),
  roundNumber: integer("round_number").notNull(),
  
  // Timing
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  currentFacultyId: varchar("current_faculty_id"), // Who's selecting now?
  
  // Status
  status: text("status").notNull(), // "not_started", "active", "completed"
  completedFaculty: integer("completed_faculty").default(0),
  totalFaculty: integer("total_faculty").notNull(),
});
```

---

## PART 8: IMPLEMENTATION ROADMAP

### Phase 1: Data Collection (Week 1)
- [ ] Input July-Dec 2025 timetable data into subjectHistory table
- [ ] Input Jan-Jun 2025 timetable data into subjectHistory table
- [ ] Calculate and store facultyLoadHistory for each faculty each semester
- [ ] Create subjectDemand table with aggregate data

### Phase 2: Backend Probability Engine (Week 2)
- [ ] Implement probability calculation algorithm
- [ ] Create `/api/subjects/probabilities` endpoint
- [ ] Create `/api/admin/rounds` endpoint for round management
- [ ] Add allocation round tracking

### Phase 3: Frontend Display (Week 2-3)
- [ ] Create SubjectCardWithProbability component
- [ ] Add probability visualization (bars, percentages, colors)
- [ ] Show historical data for each subject
- [ ] Display current round status (who's selecting, turn position)

### Phase 4: Round Management (Week 3)
- [ ] Create admin interface for managing rounds
- [ ] Set seniority order
- [ ] Define round timing
- [ ] Track selections in real-time

### Phase 5: Testing & Refinement (Week 4)
- [ ] Test with real 2025 data
- [ ] Adjust probability weights if needed
- [ ] Add analytics to see probability accuracy
- [ ] Get feedback and iterate

---

## PART 9: KEY INSIGHTS FROM TIMETABLES

### Observation 1: Load Balancing Pattern
Faculty don't get assigned same load consecutive semesters:
- Meenu: 9 → 11 (balanced up)
- Nilay: 10 → 7 (balanced down)
- R.K. Pateriya: 9 → 11 (similar high)
- Deepak: 10 → 8 (balanced down)

**Implication**: Faculty with low load in previous semester likely to get more assignments.

### Observation 2: Subject Repeat Rate
Most subjects are NOT repeated:
- Advanced Data Structures: 2/119 subjects (repeat)
- Machine Learning: 2/119 subjects (repeat)
- Others: 1 time only

**Implication**: Faculty who taught a subject likely won't get it again immediately.

### Observation 3: Core Subject Distribution
Faculty tend to specialize:
- Nilay Khare: Networks, Compilers, Seminars
- Deepak Singh Tomar: Databases, Security, MTech
- R.K. Pateriya: ML/AI focused
- Meenu Chawla: Data Structures focused

**Implication**: If a faculty specializes in topic X, they're very likely to want topic X again.

### Observation 4: MTech vs B.Tech
- Senior Professors: Mix of B.Tech and MTech
- HOD: Heavy on B.Tech + MTech research courses
- Some faculty: Exclusively B.Tech OR exclusively MTech

**Implication**: Probability should consider faculty's historical preference.

---

## PART 10: PROBABILITY WEIGHTS ADJUSTMENT

Based on timetable analysis, suggested weights:

```typescript
const WEIGHTS = {
  HISTORICAL_FREQUENCY: 0.35,      // Increased: subjects they've taught matter
  LOAD_BALANCING: 0.25,            // Slightly reduced: not always primary factor
  SUBJECT_AFFINITY: 0.25,          // Increased: specialization is very important
  SPECIALIZATION_MATCH: 0.15,      // Reduced: less critical
};

// Reason: The timetables show faculty tend to specialize 
// and repeat their expertise areas. Load balancing is secondary.
```

---

## SUMMARY

**System Overview:**
1. **Input**: Two historical timetables (Jul-Dec 2025, Jan-Jun 2025)
2. **Processing**: Analyze subject patterns, faculty load, specializations
3. **Output**: Probability score for each subject for each faculty
4. **Round**: Senior faculty select first, showing probabilities
5. **Display**: Color-coded cards showing likelihood of getting each subject

**Key Metrics:**
- Historical Frequency: How many times they've taught it
- Load Balancing: Do they need more or fewer credits?
- Subject Affinity: Is this subject in their expertise area?
- Specialization Match: Do they typically teach this type?

**User Experience:**
- Faculty sees "75% likely to get this" for their expertise areas
- "25% chance" for new subjects in their department
- "5% unlikely" for subjects outside their specialization
- Guided to make strategic choices based on data

This system turns allocation from guesswork into data-driven decision-making!
