# EduKid — Grade 1 classroom management — development plan

## 1. Project overview

EduKid is a web application for managing a Grade 1 classroom: students, simple behavior tracking, and (later) richer features such as messaging and learning games. This repository is split into a **React (Vite) frontend** and a **Node.js (Express) backend** with **MongoDB** for data storage. The current phase establishes the folder layout, database models, and documentation so API and UI work can proceed in a consistent way.

## 2. Tech stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 19, Vite, ES modules          |
| Backend  | Node.js, Express, ES modules        |
| Database | MongoDB (accessed via Mongoose)     |
| Config   | `dotenv` for environment variables  |
| HTTP     | `cors` enabled for local dev        |

## 3. Folder structure

| Path | Role |
| ---- | ---- |
| `client/` | Vite + React app. `src/pages/` and `src/components/` will hold screens and UI when built. `src/services/` holds API client helpers (e.g. base URL). |
| `server/` | Express API. `src/config/db.js` connects Mongoose to MongoDB. `src/models/` defines schemas. `src/routes/` mounts REST paths under `/api`. `src/controllers/` will hold request handlers as endpoints are implemented. |
| `docs/` | Product and engineering documentation (this file). |
| `plan.md` (repo root) | Short pointer to the full plan in `docs/plan.md`. |

## 4. Development roadmap (MVP first)

1. **Foundation (done)** — Repo layout, dependencies, Mongoose models (Student, Behavior), empty route modules, minimal React shell.
2. **API MVP** — CRUD for students; create/list behaviors linked to students; validation and consistent JSON error shapes.
3. **Frontend MVP** — Class list, student detail, simple behavior logging (GOOD / BAD / SLEEPY), basic navigation between pages.
4. **Hardening** — Input validation, indexes on common queries, basic error logging, environment-based config for production.
5. **Polish** — UX improvements, accessibility, teacher-oriented workflows (bulk actions, filters) as needed.

## 5. API plan (endpoints only)

Base path: `/api` (relative to server origin, e.g. `http://localhost:3000`).

**Students**

- `GET /api/students` — List students (optional filters: `classId`, search by name).
- `GET /api/students/:id` — Get one student.
- `POST /api/students` — Create student (`name`, `classId`, `parentEmail`).
- `PATCH /api/students/:id` — Partial update.
- `DELETE /api/students/:id` — Remove student (define behavior for related behaviors: cascade or block).

**Behaviors**

- `GET /api/behaviors` — List behavior events (optional filters: `studentId`, date range, `type`).
- `GET /api/behaviors/:id` — Get one behavior record.
- `POST /api/behaviors` — Log behavior (`studentId`, `type`: GOOD | BAD | SLEEPY).
- `DELETE /api/behaviors/:id` — Remove a record if corrections are needed.

**Cross-cutting (later, not in foundation)**

- Health/readiness route for deployments (e.g. `GET /api/health`).
- Auth and role-based routes when product requires them.

## 6. Future features

- **AI** — Suggested activities based on class patterns, gentle language for parent-facing summaries, or flagging unusual trends in behavior logs (with strict privacy review).
- **Game** — Short, age-appropriate learning games tied to class themes; progress optional and non-competitive where possible.
- **Messaging** — Secure channels between teacher and parents (templates, announcements, optional two-way messaging with moderation and consent).

---

*This document should be updated as scope and priorities change.*
