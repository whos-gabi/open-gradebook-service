# Automated Tests

This project uses **Jest**, **Supertest**, and **SQLite** for integration testing of the Open Gradebook Service.

## Prerequisites

- Node.js & npm/yarn
- Dependencies installed via `yarn install` or `npm install`

## Running Tests

Run all tests:
```bash
yarn test
```

Watch mode:
```bash
yarn test:watch
```

## Test Structure

Tests are located in the `tests/` directory.

| Test File | Entity / Feature | Status |
| :--- | :--- | :--- |
| `absences.test.js` | Absences & Justifications | ✅ Passing |
| `classes_courses.test.js` | Classes, Grade Levels, Courses | ✅ Passing |
| `grades.test.js` | Grades Management | ✅ Passing |
| `students.test.js` | Student Profiles | ✅ Passing |
| `teachers.test.js` | Teacher Management | ✅ Passing |
| `timetable.test.js` | Timetable Retrieval | ✅ Passing |
| `users.test.js` | User Me/List Queries | ✅ Passing |
| `getTeacherClasses.test.js` | Teacher Class Access | ✅ Passing |
| `studentPdfExport.test.js` | PDF Generation | ✅ Passing |

## How it works

1.  **Environment**: Tests run in `NODE_ENV=test`.
2.  **Database**:
    - A dedicated SQLite database (`prisma/test.db`) is generated to avoid messing with your local PostgreSQL data.
    - The schema is automatically adapted from `prisma/schema.prisma` to valid SQLite syntax (removing incompatible types/attributes) via `tests/helpers/setupTestSchema.js`.
    - Every test suite resets the DB state before running.
3.  **Helpers**:
    - `tests/helpers/db.js`: Prisma client instance for tests, `resetDb`, and `seedRoles`.
    - `tests/helpers/auth.js`: Generates valid JWT tokens for ANY role/user without needing strictly valid credentials in the DB.
    - `tests/helpers/setupTestSchema.js`: Handles the Postgres -> SQLite schema transpilation.

## Adding new tests

1.  Create a file `tests/yourFeature.test.js`.
2.  Import `app` and DB helpers.
3.  Use `request(app)` to hit GraphQL endpoints via `supertest`.
4.  Ensure you call `await resetDb()` and `seedRoles()` in `beforeEach`.



