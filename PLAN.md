# Quiz App — Project Plan ✅

## Summary
A simple quiz application with role-based access: admins can create quizzes and users can take them and view results. This document captures assumptions, scope, architecture, API, database schema, and next steps for implementation and testing. 💡

---

## Goals
- Build a minimal, secure REST API backend for quizzes and authentication.
- Create a responsive React frontend for quiz creation, listing and taking.
- Provide a simple scoring system and results view.

---

## Assumptions
1. **Users & Authentication**
   - Two roles: **Admin** (create/manage quizzes) and **User** (take quizzes).
   - A default admin account may be seeded on first run for convenience.
2. **Quiz structure**
   - Each quiz has a title and metadata (creator, created_at).
   - Supported question types: **multiple choice**, **true/false**, and **text**.
3. **Scoring**
   - Binary scoring by default: correct = 1, incorrect = 0.

---

## In scope ✅
- User registration, login, and role-based access control.
- Create, list, retrieve and submit quizzes via REST API.
- Score calculation and result display to the submitting user.

## Out of scope (for now) ⚠️
- Rich media (images/audio) for questions.
- Advanced scoring (partial credit, timed quizzes).
- Real-time multiplayer features.

---

## High-level architecture 🔧

Frontend (React + Vite)  —(HTTP/REST)—>  Backend (Flask)  —(SQL)—>  Database (SQLite/Postgres)

- Frontend: React + Vite, client-side routing, forms for quiz creation & taking.
- Backend: Flask with token-based auth (JWT or similar), CORS enabled.
- Database: Start with SQLite for development; plan for Postgres in production.

---

## Tech stack
- Frontend: React, Vite, Tailwind or plain CSS
- Backend: Python, Flask, Flask-CORS, Flask-JWT-Extended (or similar)
- Database: SQLite (dev) / PostgreSQL (prod)
- Testing: pytest (backend), React Testing Library (frontend)

---

## API Endpoints 📡
Authentication
- POST `/api/register` — Register a new user
- POST `/api/login` — Authenticate and return auth token
- POST `/api/logout` — (Optional) Invalidate token
- GET `/api/me` — Return current user info

Quizzes
- GET `/api/quizzes` — List all quizzes (summary)
- GET `/api/quiz/<id>` — Retrieve quiz details to take
- POST `/api/quizzes` — Create a new quiz (Admin only)
- POST `/api/quiz/<id>/submit` — Submit answers and receive score

Notes:
- Protect admin endpoints with role checks.
- Responses should be JSON with clear success/error status codes.

---

## Database Schema (draft) 🗄️

users
- id (PK)
- username (unique)
- password_hash
- is_admin (boolean)
- created_at (timestamp)

quizzes
- id (PK)
- title
- description (optional)
- created_by (FK -> users.id)
- created_at (timestamp)

questions
- id (PK)
- quiz_id (FK -> quizzes.id)
- question_text
- question_type (enum: "mcq", "tf", "text")
- options (JSON/text) — nullable (for MCQ)
- correct_answer (JSON/text) — representation depends on type

submissions
- id (PK)
- quiz_id (FK)
- user_id (FK)
- score (int)
- total (int)
- submitted_at (timestamp)

---

## Milestones & TODOs ⏳
- [ ] Initialize repo and basic project structure (frontend/backend)
- [ ] Implement authentication endpoints and user model
- [ ] Implement quiz CRUD (admin) and quiz retrieval (public)
- [ ] Implement submission endpoint and scoring logic
- [ ] Build frontend pages: login/register, quizzes list, take quiz, admin create quiz

---

## Testing & QA ✅
- Backend: unit tests for auth, quiz creation, submission scoring
- Frontend: component tests for forms and quiz flow
- Manual test plan: seed data, create quizzes, submit test answers, verify scores

---

## Deployment & Dev notes
- Use environment variables for secrets and DB config.
- Start with SQLite locally; document steps to migrate to Postgres.

---

## Conventions & Notes
- Use semantic commit messages and follow simple branching model (main + feature branches).
- Keep API stable and document changes in this `PLAN.md` or a dedicated `API.md`.

---

**Maintainers:** @muskan

*Last updated:* 2025-12-28
