# Subject Allocator

A full-stack automated subject allocation system designed for university departments. This application streamlines the complex process of assigning theory and practical (lab) subjects to faculty based on **seniority**, **preferences**, and **workload quotas**.

Built with **React**, **Node.js**, **PostgreSQL**, and **Drizzle ORM**.

##  Features

###  For Faculty

* **Preference Entry:** Interactive interface to rank preferred subjects (Theory & Labs).
* **Live Status:** View current allocation status and remaining quota.
* **Dashboard:** Personalized view of assigned subjects and schedule details.

###  For Administrators

* **Automated Allocation Algorithm:**
* **Seniority-Based Priority:** Allocates subjects to senior faculty first.
* **Round-Robin Logic:** Multi-round allocation to ensure fair distribution.
* **Conflict Resolution:** Automatically handles section capacity and duplicate assignments.


* **Workload Management:** Define specific quotas for **Theory Load** vs. **Lab Load** per faculty.
* **Subject Management:** Supports bulk upload/creation of Theory subjects and linked Laboratories.
* **Analytics Dashboard:** Visual insights into unallocated subjects, faculty utilization, and preference statistics.
* **Manual Override:** Admin control to manually assign or revoke specific subjects.

##  Tech Stack

### Frontend

* **Framework:** React 19 (Vite)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **UI Library:** Shadcn/UI (Radix Primitives)
* **State Management:** TanStack Query (React Query)
* **Forms:** React Hook Form + Zod

### Backend

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** PostgreSQL
* **ORM:** Drizzle ORM
* **Authentication:** Passport.js (Session-based)
* **Validation:** Zod

## 📂 Database Schema

The system uses a relational schema with the following key entities:

* **Users:** Stores faculty details, seniority rank, and load limits (Theory vs. Lab).
* **Subjects:** Defines courses, credits, type (Core/Elective/Lab), and section capacity.
* **Preferences:** Links Users to Subjects with a "Rank" attribute.
* **Allocations:** The final mapping of User ↔ Subject ↔ Section.
* **Round Metadata:** Tracks the state of the allocation process (Round 1, Round 2, Completed).

##  Installation & Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/subject-allocator.git
cd subject-allocator

```


2. **Install Dependencies**
```bash
npm install

```


3. **Environment Variables**
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/subject_db
SESSION_SECRET=your_super_secret_key
NODE_ENV=development

```


4. **Database Setup**
Push the schema to your PostgreSQL database:
```bash
npm run db:push

```


*(Optional) Seed dummy data for testing:*
```bash
npm run seed

```


5. **Run the Application**
Start both the backend and frontend concurrently:
```bash
npm run dev

```


The app will be available at `http://localhost:5000` (or the port specified in your console).

##  Allocation Logic

The core allocation engine works in phases:

1. **Verification:** Checks if faculty have submitted minimum required preferences.
2. **Sorting:** Faculty are sorted by `Seniority (Ascending)` -> `Username`.
3. **Round 1 (Theory):** Iterates through faculty, attempting to assign their top available preference that fits within their `maxLoad` and the subject's `capacity`.
4. **Round 2 (Cleanup):** Fills remaining slots based on secondary preferences.
5. **Lab Allocation:** A separate algorithm matches faculty to Lab sections based on their Theory subject assignments (Co-teacher logic).

##  Contributing

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
