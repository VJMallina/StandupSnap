# StandupSnap: Comprehensive Application Feature Flow

**Version:** 1.0
**Date:** 2025-12-26
**Backend:** NestJS, TypeORM, PostgreSQL, Groq AI
**Frontend:** React, Tailwind CSS

---

## 1. System Overview & Architecture

StandupSnap is a role-based Agile project management tool centered around "Snaps"—daily updates that trigger system-wide health metrics.

*   **Core Logic:** `backend/src/snap/snap.service.ts` is the central brain, handling AI parsing and RAG (Red/Amber/Green) calculations.
*   **Data Model:** Relational (PostgreSQL). Key entities: `User`, `Project`, `Sprint`, `Card`, `Snap`, `DailyLock`.
*   **Security:** JWT-based Auth with granular Permissions (RBAC).

---

## 2. Authentication & Authorization

### 2.1 User Onboarding
**Flow:**
1.  **Register:** Users POST to `/auth/register`.
    *   *Input:* Email, Password, Name, Role (SM/PO/PMO).
    *   *System:* Hashes password (bcrypt), creates `User` entity, assigns role.
2.  **Login:** Users POST to `/auth/login`.
    *   *System:* Validates credentials. Returns `accessToken` (short-lived) and `refreshToken` (long-lived).
3.  **Refresh:** POST to `/auth/refresh` exchanges a valid refresh token for a new access token.

### 2.2 Role-Based Access Control (RBAC)
**Implementation:** `PermissionsGuard` checks the `Permission` enum against the user's role.
*   **Scrum Master (SM):** Full access (`CREATE_PROJECT`, `LOCK_DAILY_SNAPS`, `EDIT_ANY_SNAP`).
*   **Product Owner (PO):** High visibility, limited write (`VIEW_SNAP`, `EDIT_CARD`, but cannot `DELETE_PROJECT`).
*   **PMO:** Read-only oversight (`VIEW_PROJECT`, `VIEW_REPORTS`).

---

## 3. Project & Team Foundation

### 3.1 Project Lifecycle
**Endpoint:** `ProjectController`
1.  **Creation:** SM creates a project (`POST /projects`).
    *   *Validation:* Start/End dates must be logical. Name must be unique.
2.  **Context Switching:** Frontend uses `ProjectSelectionContext` to filter all subsequent data (Sprints, Cards) by the selected Project ID.

### 3.2 Team Management
**Logic:** `TeamMemberService`
1.  **Global vs. Local:** `TeamMembers` are created globally (pool of resources).
2.  **Assignment:** SM assigns a member to a specific project (`POST /projects/:id/members`).
3.  **Validation:** A user must be assigned to the project to be assigned to a card within that project.

---

## 4. Work Management: Sprints & Cards

### 4.1 Sprint Configuration
**Logic:** `SprintService`
*   **Manual Creation:** SM defines dates and **Daily Standup Count** (e.g., 2 slots/day).
*   **Auto-Generation:** `generateSprints` calculates sprint cycles (e.g., 2-week intervals) from Project Start to End date.
*   **Constraint:** Sprints cannot overlap within a project.

### 4.2 Card Lifecycle
**Logic:** `CardService`
*   **Creation:** Requires `Estimated Time (ET)`—critical for RAG calculation.
*   **States:**
    *   `NOT_STARTED`: Default.
    *   `IN_PROGRESS`: **Auto-triggered** when the first Snap is added.
    *   `COMPLETED`: Manual transition by SM.
    *   `CLOSED`: Auto-transition when Sprint closes.
*   **Validation:** Cannot create/edit cards in a `CLOSED` sprint.

---

## 5. The Core Engine: Snaps & AI Logic

This is the most complex module (`SnapService`).

### 5.1 The "Snap" Creation Flow
1.  **User Input:** User selects a Card and types a raw update (e.g., "Fixed the bug, but blocked by API").
2.  **Validation:**
    *   Sprint must be `ACTIVE`.
    *   Slot must be unlocked.
    *   Card must have ET.
3.  **AI Parsing (`parseSnapWithAI`):**
    *   **Model:** Groq (`llama-3.3-70b`).
    *   **Prompt:** Extracts `Done`, `ToDo`, `Blockers` and predicts `SuggestedRAG`.
    *   **Fallback:** If AI fails, a manual regex parser runs.
4.  **Auto-Transitions:**
    *   Sets Card Status to `IN_PROGRESS` if it was `NOT_STARTED`.
    *   Updates Card's `ragStatus` based on the Snap.

### 5.2 RAG Calculation (The Brain)
**Logic:** `calculateSystemRAG`
The system determines status based on three factors:
1.  **Timeline Deviation:** `(Expected Hours - Estimated Hours) / Estimated Hours`.
    *   *> 30% Deviation* = **RED**.
2.  **Stagnation:** `getConsecutiveDaysWithoutDone`.
    *   *2+ Days w/o Progress* = **RED**.
3.  **Sentiment:** `isSevereBlocker` scans for keywords like "critical", "showstopper".

### 5.3 Slot Management
*   **Multi-Slot Logic:** If a Sprint has >1 standup/day, the system attempts to cluster snaps by time (2-hour gaps) or accepts an explicit `slotNumber` from the frontend.

---

## 6. Standup Governance: The "Lock"

### 6.1 Daily Lock
**Endpoint:** `POST /snaps/lock-daily`
*   **Trigger:** Manual (SM click) or Auto (Scheduler).
*   **Effect:**
    1.  Sets `isLocked = true` for all snaps on that date/slot.
    2.  Freezes the RAG status.
    3.  **Generates Daily Summary:** Aggregates all Done/ToDo/Blockers for the whole team into `DailySummary` entity.

### 6.2 The Standup Book
**Module:** `StandupBook`
*   **View:** Displays a read-only historical record of a specific date.
*   **Structure:** Grouped by `Slot` -> `Assignee`.
*   **MOM (Minutes of Meeting):** Users can generate MOMs for a specific locked day using `StandupService`.

---

## 7. Artifacts & Advanced Features

### 7.1 Form Builder (Dynamic Docs)
**Module:** `artifacts/form-builder`
*   **Templates:** JSON schema defining fields (Text, Date, Dropdown).
*   **Instances:** Actual filled forms (stored as JSONB).
*   **Use Case:** Creating custom "Change Requests" or "Project Charters" without changing code.

### 7.2 RAID & Registers
**Module:** `artifacts`
*   **RAID Log:** Centralized table for Risks, Assumptions, Issues, Dependencies.
*   **Stakeholder Register:** Matrix of Influence vs. Interest.
*   **Resource Tracker:** Heatmap visualization of `TeamMember` workload (Availability vs. Assignment).

### 7.3 Scrum Rooms
**Module:** `scrum-rooms`
*   **Standalone:** These rooms (Planning Poker, Retro) operate independently of the Sprint cycle.
*   **Persistence:** Room state is saved via `ScrumRoom` entity.

---

## 8. Integration & Data Flow Summary

| Action | Triggers | Module Interaction |
| :--- | :--- | :--- |
| **User Creates Snap** | -> AI Parsing | `SnapService` calls Groq API |
| | -> Status Change | `SnapService` calls `CardService.markAsInProgress` |
| | -> RAG Update | `SnapService` recalculates Card RAG |
| **SM Locks Day** | -> Freeze Data | `SnapService` sets `isLocked` flag |
| | -> Generate Summary | `SnapService` creates `DailySummary` |
| **Sprint Closing** | -> Close Cards | `SprintService` calls `CardService.closeAllCardsInSprint` |

---

## 9. Future Roadmap (Implied by Codebase)
*   **Version History:** `CardRAGHistory` entity exists, suggesting trend analysis features.
*   **Notifications:** `MailService` is scaffolded for invites/reset password.
*   **Artifact Integration:** Linking RAID items directly to Cards (Not yet fully implemented but planned).
