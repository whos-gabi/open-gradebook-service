# School Gradebook API 

![Project Status](https://img.shields.io/badge/status-in%20development-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

A backend service for an Electronic School Catalog, built with **Node.js** and **GraphQL**. This system manages students, classes, grades, and attendance with strict role-based access control.

## ✅ Project Requirements (Final Exam Checklist)

This project is built to strictly follow the university requirements:

* ✅ Implement GraphQL API instead of REST.
* ✅ Secure Authentication via JWT with Role management (Admin/User).
* ✅ Authorization logic (restrict operations based on roles).
* ✅ Paginated lists using offset-based pagination.
* ✅ Implementation of 3-4 distinct business logic flows.
* ✅ Use Nested Return Types (returning full objects, not just IDs).
* ✅ Use GraphQL Input Types for mutations.
* ✅ ORM integration for database interaction.
* ✅ Context-based User ID inference (read ID from token, not arguments).
* ✅ Implementation of all relationship types: 1:1, 1:Many, Many:Many .
* ✅ Automated Tests (1 Happy Path + 1 Sad Path per query/mutation).
* ✅ Clean GitHub history with regular commits and merges.
* ✅ Functional and runnable application.

---

## 🛠️ Tech Stack (target)

* **Runtime:** Node.js
* **API Standard:** GraphQL (planned)
* **Server Framework:** Express (minimal placeholder)
* **Database/ORM:** Planned (Prisma/TypeORM/etc.)
* **Testing:** Planned (Jest)

## 📐 Database Relations Plan

To satisfy the relation requirements:

1.  **1:1 (One-to-One):** `User` ↔ `Profile` (Address, Phone).
2.  **1:Many (One-to-Many):** `Class` ↔ `Students` (A class has many students).
3.  **Many:Many (Many-to-Many):** `Students` ↔ `Courses` (via Enrollment/Grades).

## 🔄 Core Business Flows

1.  **Grading Flow:** Teacher Selects Class -> Selects Student -> Adds Grade -> Grade affects GPA.
2.  **Attendance Flow:** Teacher Selects Class -> Marks Absence -> Student views Absence -> Parent motivates Absence.
3.  **Admin Flow:** Admin creates User -> Assigns Role -> Assigns User to Class.

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Yarn (Classic) — recommended: enable via Corepack (`corepack enable`)

### Installation

1) Install dependencies:

```bash
corepack enable
yarn install
```

2) Configure database & run migrations:

Create a `.env` file in the project root with your PostgreSQL connection string:

```bash
# .env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/open_gradebook?schema=public"
```

Then apply Prisma migrations (and create the database if missing):

```bash
yarn prisma migrate dev
```

Optionally generate the Prisma client explicitly:

```bash
yarn prisma generate
```

3) Start the dev server:

```bash
yarn dev
```

Health endpoint: `http://localhost:4000/health`

## 🧪 Testing

No tests yet.

## 📂 Project Structure

```
index.js                  # Minimal Express server (only runnable code)
auth/                     # JWT, auth helpers (TODO)
db/                       # ORM/DB setup (TODO)
graphql/                  # Schema and resolvers (TODO)
models/                   # Domain models (TODO)
server/                   # Server composition/wiring (TODO)
tests/                    # Test files (TODO)
utils/                    # Utilities (TODO)
prisma/                   # ORM schemas/migrations (TODO)
```
