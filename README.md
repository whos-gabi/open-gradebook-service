# School Gradebook API

![Project Status](https://img.shields.io/badge/status-in%20development-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

A backend service for an Electronic School Catalog, built with **Node.js**, **GraphQL**, and **Prisma**.

## ✅ Project Requirements (Final Checklist)

This project is built to strictly follow the university requirements:

* ✅ GraphQL API (REST used only for auth + file download).
* ✅ Secure Authentication via JWT with Role management (Admin/Teacher/Student).
* ✅ Authorization logic (restrict operations based on roles).
* ✅ Paginated lists using offset-based pagination.
* ✅ Implementation of 3-4 distinct business logic flows.
* ✅ Use Nested Return Types (returning full objects, not just IDs).
* ✅ Use GraphQL Input Types for mutations.
* ✅ ORM integration for database interaction.
* ✅ Context-based User ID inference (read ID from token, not arguments).
* ✅ Implementation of all relationship types: 1:1, 1:Many, Many:Many .
* ✅ Automated integration tests (Jest + Supertest + SQLite).
* ✅ Clean GitHub history with regular commits and merges.
* ✅ Functional and runnable application.

---

## 🛠️ Tech Stack

* **Runtime**: Node.js
* **HTTP Server**: Express
* **GraphQL**: Server (`/graphql`)
* **Student Notifications (WS)**: Plain WebSocket auto-subscribe (`ws://localhost:4000/ws/grades`)
* **Database/ORM**: Prisma
* **Tests**: Jest + Supertest + SQLite (via `schema.test.prisma`)
* **PDF Export**: Puppeteer (HTML → PDF)


## 🛢️ DB Schema:
![DB Schema jpeg](./docs/db_schema.jpeg)

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Yarn (Classic)

### -> [Import endpoints in Bruno](./docs/open-gradebook-service.json) 🐶

### Setup

```bash
corepack enable
yarn install
```

Create a `.env` file:

```bash
# .env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/open_gradebook?schema=public"
JWT_SECRET="your-secret"
```

Run migrations:

```bash
yarn prisma migrate dev
```

Start:

```bash
yarn dev
```

Endpoints:
* `GET /health`
* `POST /graphql`
* `ws://localhost:4000/graphql` (GraphQL subscriptions)
* `ws://localhost:4000/ws/grades` (student grade notifications)

## 🧪 Testing

```bash
yarn test
```

Watch mode:
```bash
yarn test:watch
```

## 🔐 Auth (REST)

* `POST /auth/login` → returns JWT containing `user_id` + `role_id`
* `POST /auth/register` (**Admin only**) → creates a Teacher/Student user + 1:1 profile

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

JWT is required for protected routes.

## 📄 PDF Export (REST)

* `GET /api/export/student/:id` (**Teacher/Admin only**) → streams a PDF (HTML template → Puppeteer → PDF)

## 📊 GraphQL

* `POST /graphql` (Apollo Server)
* `ws://localhost:4000/graphql` (GraphQL subscriptions via `graphql-ws`)

## 📂 Project Structure

```
index.js                  # Express + Apollo + WebSocket wiring
auth/                     # JWT, auth helpers, role middleware
graphql/                  # SDL + resolvers
lib/                      # Prisma client, PDF, WS notification hub
prisma/                   # Prisma schemas + migrations
tests/                    # Jest + Supertest integration tests
```
