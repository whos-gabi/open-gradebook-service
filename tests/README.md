# Automated Tests

This project uses **Jest**, **Supertest**, and **SQLite** for integration testing.

## Prerequisites

- Node.js & npm/yarn
- Dependencies installed via `yarn install` or `npm install`

## Running Tests

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

## How it works

1.  **Environment**: Tests run in `NODE_ENV=test`.
2.  **Database**:
    - A dedicated SQLite database (`prisma/test.db`) is generated to avoid messing with your local PostgreSQL data.
    - The schema is automatically adapted from `prisma/schema.prisma` to valid SQLite syntax (removing incompatible types/attributes) via `tests/helpers/setupTestSchema.js`.
    - Every test suite resets the DB state before running.
3.  **Helpers**:
    - `tests/helpers/db.js`: Prisma client instance for tests, `resetDb`, and `seedRoles`.
    - `tests/helpers/auth.js`: Generates valid JWT tokens for ANY role/user without needing strictly valid credentials in the DB (bypassing auth endpoints for speed).
    - `tests/helpers/jest.setup.js`: Mocks the main application's Prisma client to use the SQLite test client.

## Adding new tests

1.  Create a file `tests/yourFeature.test.js`.
2.  Import `startServer`, `app`, `prisma`, `generateToken`.
3.  Use `request(app)` to hit `http://localhost:${port}/graphql` or REST endpoints via `supertest`.
4.  Ensure you call `await resetDb()` and `seedRoles()` in `beforeEach`.



