# StandupSnap Flow

## 1) High-Level Architecture
- Backend: NestJS + TypeORM/Postgres (`backend/src/app.module.ts`), JWT auth, Groq AI parsing.
- Frontend: React 18 + Vite + Tailwind (`frontend/src/App.tsx`), protected routes, modals for snaps.
- Storage: Postgres (docker-compose), TypeORM sync (dev).
- AI: Groq chat completions (standup + snap parsing), manual fallback in snap service.
- Mail: SMTP for invites/reset (backend/src/mail).
- Export: TXT/DOCX summaries on client; artifacts/standup-book modules for exports/history.

## 2) Auth & Session Flow
1. Register/Login -> `/auth/register|login` (AuthController) -> JWT access + refresh stored in localStorage.
2. `AuthContext` (`frontend/src/context/AuthContext.tsx`) fetches `/auth/me` on load; guards routes via `ProtectedRoute`.
3. Refresh: `/auth/refresh` rotates tokens; logout revokes refresh.
4. Forgot/Reset: `/auth/forgot-password` sends email; `/auth/reset-password` sets new password.

## 3) Project/Team Flow
1. Create project (POST `/projects`) with permissions guard.
2. Team management: add/remove members (`/projects/:id/members` and team endpoints) -> `TeamMember` entities linked to projects.
3. Invitations: send + assign role; accepted -> team membership.

## 4) Sprint & Card Flow
1. Create sprint under project with dates/status + optional multiple daily standup slots (`dailyStandupCount`, `slotTimes`).
2. Create cards under sprint/project; `estimatedTime` mandatory; statuses `not_started -> in_progress -> completed -> closed`; optional externalId/assignee.
3. Changing first snap auto-sets card to `in_progress`.

## 5) Snap (Daily Update) Flow
1. Open Snaps page (`/snaps`):
   - Select project -> fetch sprints -> pick sprint + date -> load snaps, lock state via `snapsApi`.
   - "Create Snap" opens card picker (cards filtered by sprint).
2. Create:
   - Backend validates: card exists, ET present, sprint ACTIVE/not closed, date within sprint, slotNumber within dailyStandupCount, day/slot not locked.
   - If Done/ToDo/Blockers missing, calls Groq parse; suggestedRAG computed; snap saved; card status auto?`in_progress`; card ragStatus recalculated.
3. Edit/Delete:
   - Creator-only, only today, only if not locked, sprint ACTIVE; edit can re-run AI parse; delete recalculates card ragStatus.
4. RAG override: today-only, before lock; sets finalRAG; card ragStatus updated.
5. Lock day:
   - Manual `/snaps/lock-daily` or scheduler: locks snaps for sprint+date (slot-aware), writes DailySnapLock/DailyLock, generates DailySummary (aggregated Done/ToDo/Blockers, RAG counts/assignee rollup), records history.
6. Summaries:
   - Stored in `DailySummary`; exports via frontend TXT/DOCX; API `/snaps/summary/:sprintId/:date` and `generate-summary`.
7. Aggregations:
   - Card ragStatus = latest snap finalRAG trend.
   - Sprint RAG worst-case of card ragStatus; Project RAG worst-case of sprint RAG.

### Snap Flow Diagram (text)
```
Select project ? load sprints ? pick sprint+date
? fetch snaps + lock status
? (if unlocked) pick card ? fetch recent snaps for context
? submit rawInput [+ optional Done/ToDo/Blockers] [+ slotNumber]
? backend validates (ET, sprint active, date in range, slot allowed, not locked)
? AI parse (Groq) if needed ? save snap ? card status auto IN_PROGRESS ? card RAG recalculated
? list updates; allow edit/delete/override (today, unlocked, creator)
? lock day ? lock records + daily summary + RAG history
? export TXT/DOCX
```

## 6) Standup Generator (Simple)
- Endpoint `/standup/generate` (StandupService) parses free-form update to Yesterday/Today/Blockers JSON + formatted text (Groq). Frontend page currently placeholder (`StandupsPage.tsx`).

## 7) Key Modules (backend)
- Auth: `backend/src/auth/*`
- Projects/Team: `backend/src/project/*`, `backend/src/team-member/*`, `backend/src/invitation/*`
- Sprints: `backend/src/sprint/*`
- Cards: `backend/src/card/*`
- Snaps: `backend/src/snap/*` (lock, summary, RAG, AI parse)
- RAG history/daily locks/summaries: `backend/src/entities/*` (daily-lock, daily-snap-lock, daily-summary, card-rag-history)
- Dashboards/Reports/Artifacts/Standup-Book: respective modules under `backend/src/`

## 8) Key Modules (frontend)
- Routing: `frontend/src/App.tsx`
- Auth context/guard: `frontend/src/context/AuthContext.tsx`, `components/ProtectedRoute`
- Snaps UX: `frontend/src/pages/SnapsPage.tsx`, `components/snaps/*`, `services/api/snaps.ts`
- Projects/Sprints/Cards: `frontend/src/pages/projects/*`, `.../sprints/*`, `.../cards/*`
- Other pages: standup-book, artifacts, reports, assignees, dashboard.

## 9) Environments & Ops
- `.env` (root/backend/frontend) for API URLs, DB, GROQ keys, SMTP.
- Dev: TypeORM sync enabled; docker-compose brings Postgres.
- Deploy: Fly.io configs (`Dockerfile.fly`, `fly.toml` in backend/frontend).
