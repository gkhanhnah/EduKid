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

## 7. Roles & access control (enterprise)

### 7.1 Teacher

| Capability | Notes |
| ---------- | ----- |
| Manage multiple classes | Create/update class metadata; assign self or co-teachers as policy allows. |
| View student counts per class | Dashboard aggregates from `Class` ↔ `Student`. |
| Manage student list | CRUD within classes the teacher owns or is assigned to. |
| Teaching schedule (timetable) | CRUD schedule entries per class (`Schedule` model). |
| Behavior tracking | Existing flow: log GOOD / BAD / NOTE (or aligned enum) per student. |
| Evaluate students | Structured `Evaluation` records (scores, rubric, comments) per student. |
| Behavior history | Read-only views filtered by class/student and date. |
| Chat with parents (real-time) | Threads scoped by student or class; see §11. |
| Games & AI lesson | Use existing **Games** and **AI Lesson** pages in teaching context; optional deep links from class/student. |

### 7.2 Parent

**Enrollment rule:** A parent account must be linked to **at least one** student via `ParentStudent`. A parent may link **multiple** children; each child may sit in a **different** class.

| Capability | Notes |
| ---------- | ----- |
| Unified dashboard | Single **Parent Dashboard** listing all linked children with class/school context. |
| Timetable per child | Read `Schedule` for the class of each child. |
| Behavior tracking & history | Read behaviors for linked students only. |
| Teacher evaluations | Read `Evaluation` for linked students only. |
| Learning performance | Phase 1: summary from evaluations + optional game/progress fields; Phase 2+: analytics. |
| Chat with teachers (real-time) | Same transport as teachers; access limited to threads involving their children. |

### 7.3 Enforcement

- **Authentication:** JWT (or session) after login/register; payload includes `userId`, `role` (`TEACHER` | `PARENT`).
- **Authorization:** Every mutating and sensitive read route checks role + resource ownership (teacher’s classes vs parent’s children).
- **Auditing (recommended):** Log critical actions (evaluation create, class reassignment, parent link changes).

---

## 8. New core modules

### 8.1 Class management

| | |
| --- | --- |
| **Purpose** | Canonical grouping for students, schedules, and access scoping for teachers. |
| **Who** | Primarily **Teacher** (create/edit/archive class). **Parent** reads class name/context for their children only. |
| **UI connection** | Extend **Teacher Dashboard** (class switcher, counts). **Student** page filters by selected class. Optional dedicated **Classes** sub-route under teacher area. |

### 8.2 Schedule / timetable

| | |
| --- | --- |
| **Purpose** | Recurring or dated slots (subject, time, room/notes) per class. |
| **Who** | **Teacher** CRUD for their classes. **Parent** read-only per child’s class. |
| **UI connection** | New section on **Teacher Dashboard**; **Parent Dashboard** shows per-child timetable. |

### 8.3 Evaluation system

| | |
| --- | --- |
| **Purpose** | Formal teacher assessments (beyond quick behavior logs): rubric, period, comments. |
| **Who** | **Teacher** create/update. **Parent** read for their children. |
| **UI connection** | New **Evaluations** UI (or tabs on **Student** / **Behavior History**). Distinct from quick **Behavior Tracking** events. |

### 8.4 Parent–child management

| | |
| --- | --- |
| **Purpose** | Link `User` (PARENT) to `Student` with optional invite codes, verification, or admin approval. |
| **Who** | **Teacher** or admin invites/links; **Parent** accepts or registers with code. |
| **UI connection** | **Parent Dashboard** (list children). Teacher **Student** management: “Link parent” action. |

### 8.5 Messaging (real-time)

| | |
| --- | --- |
| **Purpose** | Two-way chat teacher ↔ parent with context (student/class). |
| **Who** | **Teacher** and **Parent** (no student login assumed for Grade 1). |
| **UI connection** | Existing **Messages** page becomes the client for WebSocket (or Firebase) channels. |

---

## 9. Data model extension

*Assumes MongoDB + Mongoose. Field names are indicative; adjust to match existing `Student` / `Behavior` as you migrate.*

### 9.1 User (new)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `email` | String, unique | Login id. |
| `passwordHash` | String | Never store plain text. |
| `role` | Enum `TEACHER` \| `PARENT` | Drives authorization. |
| `name` | String | Display name. |
| `createdAt` | Date | |

**Relationships:** Teachers referenced by `Class.teacherIds` (or `primaryTeacherId`). Parents linked via `ParentStudent`.

**Example document:**

```json
{
  "_id": "…",
  "email": "teacher@school.edu",
  "passwordHash": "…",
  "role": "TEACHER",
  "name": "Ms. Tran",
  "createdAt": "2025-09-01T00:00:00.000Z"
}
```

### 9.2 Class (new)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `name` | String | e.g. “Grade 1A”. |
| `grade` | String / Number | e.g. `1`. |
| `teacherIds` | [ObjectId] ref `User` | Teachers who manage this class. |
| `schoolYear` | String | Optional, e.g. `2025-2026`. |
| `createdAt` | Date | |

**Relationships:** One class has many students (`Student.classId`). One class has many `Schedule` rows.

**Example:**

```json
{
  "_id": "…",
  "name": "Grade 1A",
  "grade": 1,
  "teacherIds": ["…"],
  "schoolYear": "2025-2026"
}
```

### 9.3 Student (extend existing)

| Field | Notes |
| ----- | ----- |
| `classId` | **Required** ref `Class` — student belongs to exactly one class (§12). |
| Existing: `name`, `age`, `gender`, `className` | Prefer `classId` as source of truth; deprecate duplicate `className` or sync from `Class.name` on read. |

### 9.4 Schedule (new)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `classId` | ObjectId ref `Class` | Required. |
| `dayOfWeek` | Number 0–6 or enum | If weekly pattern. |
| `date` | Date | Optional for one-off overrides. |
| `startTime` / `endTime` | String or Date parts | e.g. `"08:00"`–`"08:45"`. |
| `subject` | String | |
| `room` / `notes` | String | Optional. |
| `createdAt` | Date | |

**Example:**

```json
{
  "classId": "…",
  "dayOfWeek": 1,
  "startTime": "08:00",
  "endTime": "08:45",
  "subject": "Math"
}
```

### 9.5 Evaluation (new)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `studentId` | ObjectId ref `Student` | Required. |
| `teacherId` | ObjectId ref `User` | Required; must be `role: TEACHER`. |
| `period` | String | e.g. `Q1`, `Week 3`. |
| `rubric` / `scores` | Mixed or subdocument | e.g. `{ reading: 3, math: 4 }`. |
| `comment` | String | |
| `createdAt` | Date | |

**Example:**

```json
{
  "studentId": "…",
  "teacherId": "…",
  "period": "2025-Q1",
  "scores": { "reading": 3, "math": 4 },
  "comment": "Strong participation."
}
```

### 9.6 Behavior (existing — align)

| Field | Notes |
| ----- | ----- |
| `studentId` | ref `Student` (required). |
| `behaviorType` | Enum aligned with product (e.g. GOOD, BAD, NOTE). |
| `description`, `date`, `createdAt` | As implemented. |

### 9.7 Message (new)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `conversationId` | ObjectId ref `Conversation` *or* composite key | See §11 if `Conversation` is a separate collection. |
| `senderId` | ObjectId ref `User` | |
| `body` | String | |
| `createdAt` | Date | |

*Alternative:* embed messages in a `Conversation` document with a capped array + archive strategy for scale.

### 9.8 Conversation (recommended, new)

| Field | Notes |
| ----- | ----- |
| `participantIds` | [User] — teacher + parent. |
| `scope` | `STUDENT` \| `CLASS` |
| `studentId` / `classId` | Which student or class contextualizes the thread. |
| `lastMessageAt` | For sorting inbox. |

### 9.9 ParentStudent (new)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `parentUserId` | ObjectId ref `User` | `role` must be PARENT. |
| `studentId` | ObjectId ref `Student` | |
| `relationship` | String | Optional: “mother”, “guardian”. |
| `verified` | Boolean | Optional invite/approval workflow. |
| `createdAt` | Date | |

**Example:**

```json
{
  "parentUserId": "…",
  "studentId": "…",
  "relationship": "guardian",
  "verified": true
}
```

---

## 10. API expansion plan

**Keep all existing endpoints** in §5 (`/api/students`, `/api/behaviors`). Extend payloads where models evolve (e.g. `classId` on student). Below are **additions**.

### 10.1 Auth

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/auth/register` | Register (role constrained or invite-only for parents). |
| POST | `/api/auth/login` | Issue JWT / session. |
| POST | `/api/auth/logout` | Invalidate refresh token / session (if used). |
| GET | `/api/auth/me` | Current user + role + minimal profile. |
| POST | `/api/auth/refresh` | Optional refresh token rotation. |

**Role-based access:** Middleware reads `role` from token; route handlers verify resource scope (class ownership, parent-child link).

### 10.2 Class API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/classes` | List classes for current teacher (or admin). |
| GET | `/api/classes/:id` | Detail + optional student count. |
| POST | `/api/classes` | Create class. |
| PATCH | `/api/classes/:id` | Update metadata / teacher assignment. |
| DELETE | `/api/classes/:id` | Soft-delete or archive (prefer soft-delete if students exist). |
| GET | `/api/classes/:id/students` | Students in class (teacher scoped). |

### 10.3 Schedule API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/schedules` | Query `?classId=&from=&to=` |
| GET | `/api/schedules/:id` | One slot. |
| POST | `/api/schedules` | Create (teacher, class must be theirs). |
| PATCH | `/api/schedules/:id` | Update. |
| DELETE | `/api/schedules/:id` | Delete. |

### 10.4 Evaluation API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/evaluations` | Query `?studentId=` / `?classId=` (teacher); parent: implicit child ids only. |
| GET | `/api/evaluations/:id` | One record. |
| POST | `/api/evaluations` | Create (`studentId`, `teacherId` from token, scores, comment, period). |
| PATCH | `/api/evaluations/:id` | Update (teacher owner). |
| DELETE | `/api/evaluations/:id` | Optional soft-delete. |

### 10.5 Parent–child API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/parents/me/children` | List linked students + class summary. |
| POST | `/api/parent-students` | Link parent to student (teacher/admin or invite flow). |
| DELETE | `/api/parent-students/:id` | Unlink (with safeguards). |

### 10.6 Messaging API (HTTP + real-time)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/conversations` | Inbox for current user. |
| POST | `/api/conversations` | Start thread (student or class scope). |
| GET | `/api/conversations/:id/messages` | Paginated history. |
| POST | `/api/conversations/:id/messages` | HTTP fallback post (optional if WS-only send). |

WebSocket events mirror create message / delivery acks (§11).

### 10.7 Cross-cutting

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/health` | Liveness for deployments. |

---

## 11. Real-time system design (messaging)

### 11.1 Recommended approach

| Option | When to use |
| ------ | ----------- |
| **Socket.IO** (on same Node server or separate WS service) | Full control, same stack as Express, fine for school-scale concurrency. |
| **Firebase (Firestore + presence)** | Faster time-to-market for mobile later; vendor lock-in and pricing review. |

**Default recommendation for this codebase:** **Socket.IO** alongside Express, authenticated via JWT on connection handshake (`socket.handshake.auth.token`). Namespaces or rooms per `conversationId`.

### 11.2 Conversation model (logical)

- **Per student:** `Conversation` with `scope: STUDENT`, `studentId` — parent(s) of that student + assigned teacher(s) for the student’s class.
- **Per class:** `scope: CLASS`, `classId` — all parents of students in class + class teachers (use for announcements; mute or read-only for parents if product requires).

### 11.3 Message flow

1. Client opens WS with valid token; server attaches `userId`, `role`.
2. Client joins room `conversation:<id>` after HTTP `POST /api/conversations` or list selection.
3. `message:send` → server validates membership → persists `Message` → broadcasts `message:new` to room.
4. Optional: `message:read` for read receipts.

### 11.4 Online status (optional)

- Heartbeat or “last seen” in Redis/memory store keyed by `userId`.
- Broadcast `presence:update` sparingly to avoid noise.

### 11.5 Notifications

- **In-app:** unread count via `GET /api/conversations` or WS `notification:unread`.
- **Phase 2:** email/push (FCM) on new message when user offline; respect quiet hours and consent.

---

## 12. Business rules & constraints

### 12.1 Core invariants

| Rule | Enforcement |
| ---- | ----------- |
| A **student** belongs to **exactly one** `classId` at a time. | Required ref on `Student`; migration sets class for legacy rows. |
| A **teacher** can manage **multiple** classes. | `Class.teacherIds` includes their `User._id`. |
| A **parent** can have **multiple** children. | Multiple `ParentStudent` rows per `parentUserId`. |
| **Parent** can **only** access data for **linked** students. | Middleware resolves allowed `studentId` set from `ParentStudent`. |
| **Teacher** can **only** access **their** classes (and students in those classes). | Check `classId` ∈ teacher’s classes for every read/write. |
| **Evaluation** belongs to **one student** and **one teacher**. | Required `studentId` + `teacherId` from token; student must be in teacher’s class. |
| **Behavior** belongs to **one student**. | Existing rule; optionally restrict create to teacher of student’s class. |
| **Schedule** belongs to **one class**. | Required `classId`; teacher must manage that class. |

### 12.2 Edge cases

| Scenario | Policy |
| -------- | ------ |
| **Deleting a student** | Soft-delete preferred. Option A: cascade archive behaviors/evaluations/messages. Option B: block delete until behaviors reassigned or archived. Document choice in API. |
| **Re-assign class** | Update `Student.classId`; evaluations/behaviors remain historical (still valid). Parent links unchanged. Invalidate cached timetable on parent app. |
| **Parent with children in different classes** | `ParentStudent` rows point to different `studentId` each with its own `classId`; dashboard loads N timetables; conversations default per child or per class per product choice. |
| **Teacher removed from class** | Remove from `Class.teacherIds`; deny new edits; optional read-only window for compliance. |
| **Duplicate parent link** | Unique compound index on `(parentUserId, studentId)`. |

---

## 13. Integration with existing system

| Area | Integration |
| ---- | ----------- |
| **Student API** | Add `classId` (required) and optional denormalized `className` for display. Class APIs drive filters on **Student** management UI and teacher dashboard counts. |
| **Behavior API** | Continue `POST/GET /api/behaviors`; server enforces that `studentId` is in a class the caller teaches (or parent can read only their children). **Behavior Tracking** / **Behavior History** pages pass `classId` filter when teacher selects a class. |
| **Dashboard** | Teacher: aggregate students per class, upcoming schedule snippets, unread messages. Parent: per-child cards → timetable, behaviors, evaluations. |
| **Games / AI Lesson** | Optional query params `?studentId=` / `?classId=` for context logging (Phase 2); no breaking change to current routes. |
| **Messages** | Replace mock/static UI with conversation list + WS; same routes as §10.6. |

---

## 14. MVP vs Phase 2 vs Phase 3

### 14.1 MVP (ship next)

- **Class** model + **Class API** + teacher class switcher on dashboard.
- **Schedule** model + **Schedule API** + basic timetable UI (teacher edit, parent read).
- **Basic evaluation** — single rubric or free-text + period; **Evaluation API**; parent read-only view.
- **Parent view** — auth as PARENT, `ParentStudent` link (manual admin or invite code), parent dashboard with children list.
- **Basic chat** — one conversation per student (teacher + linked parents), Socket.IO, message persistence, simple inbox on **Messages** page.

### 14.2 Phase 2

- **Advanced analytics** — behavior trends, evaluation summaries per class.
- **Notifications** — email/push for messages and key events.
- **Multi-class dashboard** — comparative metrics, workload view for teachers with many classes.

### 14.3 Phase 3

- **AI insights** — tie into §6 Future features: trends, parent-facing summaries (with privacy review).
- **Smart recommendations** — activities based on behavior + evaluation patterns.
- **Gamification** — richer **Games** integration with class goals and optional non-competitive leaderboards.

---

*This document should be updated as scope and priorities change.*
