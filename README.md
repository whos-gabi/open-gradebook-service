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

This project uses **Jest**, **Supertest**, and **SQLite** for integration testing.

### Prerequisites

- Node.js & npm/yarn
- Dependencies installed via `yarn install` or `npm install`

### Running Tests

Run all tests:
```bash
npm test
# or
yarn test
```
Watch mode (for development):
```bash
npm run test:watch
```

## 🔐 Auth Routes (WIP API surface)

While the GraphQL layer is still in progress, the service already exposes minimal REST endpoints for authentication and seeding initial users:

- `POST /auth/login` – accepts `{ "username": "...", "password": "..." }` (or `email`) and returns a JWT containing `user_id` and `role_id`. Passwords are hashed with SHA-256 before comparison.
- `POST /auth/register` – **Admin-only** endpoint protected by `roleMiddleware`. Accepts base user information plus `roleId` (only `2` for Teacher or `3` for Student) and creates the matching entry in the `teachers`/`students` tables via Prisma. Example payload:

```json
{
  "username": "student.one",
  "email": "student.one@example.com",
  "password": "secret123",
  "firstName": "Student",
  "lastName": "One",
  "roleId": 3,
  "student": {
    "classId": 1,
    "dateOfBirth": "2010-09-01"
  }
}
```

Set the `JWT_SECRET` env variable before starting the server; both the login route and the `roleMiddleware` rely on it for signing and verifying tokens. After a successful login the sanitized user is cached in an in-memory context store keyed by the JWT, so future `/graphql` requests can access the already-fetched user via `req.context.user` after the token is verified by `roleMiddleware`.

### Reports & PDF Export

- `GET /api/export/student/:id` – Teacher/Admin-only endpoint that streams a PDF with the student's catalog: headers with school branding, student/class details, per-subject grades (including averages), overall GPA, and an absences summary. The PDF is generated with **pdfkit** and can be downloaded directly from the browser (used by a “Descarcă Raport” button in the UI). Style colors follow the brand palette defined in `lib/pdfTemplates.js`.

## 📊 GraphQL (WIP)

- `POST /graphql` – teacher-only GraphQL endpoint (Apollo Server). Run the `getTeacherClasses` query to receive `{ totalClasses, classes[] }` including grade info, academic year, taught subject, and whether the teacher is the homeroom lead. GraphiQL (Apollo Sandbox) is enabled when `NODE_ENV !== 'production'`.

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
