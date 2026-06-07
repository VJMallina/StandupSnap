# Artifacts Module — Improvement Plan

## Current State

The module has a solid foundation:
- **RACI Matrix** — interactive builder with tasks, team members, RACI role assignment, external stakeholders, approval workflow, resizable columns
- **Artifact Templates** — JSONB-based form structure with system + project templates, categories (PROJECT_GOVERNANCE, PLANNING_BUDGETING, EXECUTION_MONITORING, RISK_QUALITY, CLOSURE_REPORTING, CUSTOM)
- **Artifact Instances** — create documents from templates with status tracking (DRAFT → IN_PROGRESS → COMPLETED → ARCHIVED)
- **Artifact Versions** — full version control with major/minor versioning (1.0, 1.1, 2.0), change summaries, and restore to any previous version
- **Artifacts Hub** — landing page showing 9 artifact types with project-scoped counts

---

## Gaps & Improvements

### 1. The Document Form Builder is a Black Box *(Critical)*

`templateStructure` is a raw JSONB blob and `ArtifactVersion.data` is also raw JSONB. There is no visible UI for building a form from a template or filling one out. The hub points to `/artifacts/documents` but without a real form builder, templates are unusable by non-developers.

**What to build:**
- Drag-and-drop field type builder: text, textarea, date, dropdown, table, checklist, number, signature
- Matching form-fill UI for instances — render the template structure as an actual form
- Field validation rules (required, max length, date range)

---

### 2. No Export Anywhere *(High)*

RACI matrices, document instances, and version history cannot be exported. Every stakeholder meeting requires a printout but there's no way to get data out of the system.

**What to build:**
- Export RACI matrix to **PDF** (formatted table) and **Excel/CSV** (most requested format in PM tools)
- Export document instances to **PDF** and **DOCX** (the `docx` package is already installed — used in Standalone MOM)
- Print-friendly view for RACI matrix

---

### 3. RACI Has No Validation *(High)*

Nothing prevents a task having zero Accountable owners, five Accountable owners, or zero Responsible people. The RACI model breaks down without these constraints.

**What to build:**
- Warn (not block) when a task has no R assigned
- Warn when a task has more than one A assigned
- Responsibility summary view: "Bob is Responsible for 12 tasks, Accountable for 3" — highlights overloaded team members
- Optional: Enforce at least one R and exactly one A per task before marking matrix as complete

---

### 4. Version Comparison is Missing *(Medium)*

You can restore a previous version but cannot see *what changed* between v1.0 and v2.0. The `changeSummary` field is just a free-text note — there is no actual diff.

**What to build:**
- Side-by-side version diff showing field-by-field changes between any two selected versions
- Highlight added, removed, and modified content
- Version timeline view showing change history visually

---

### 5. No Review / Approval Workflow on Documents *(Medium)*

Instances have statuses but no formal review cycle. There is no way to submit for review, assign a reviewer, get approval/rejection with comments, or require sign-off before COMPLETED status.

**What to build:**
- Review cycle: Submit → Under Review → Approved / Rejected
- Reviewer assignment (reuse the approver model already on RACI)
- Comment/feedback on rejection
- Approval history log
- Email notification to reviewer on submission

---

### 6. Hub "Coming Soon" Items Disconnected from Existing Data *(Low effort, High impact)*

The hub shows **Decision Log** as "Coming Soon" but the backend already has a full `Decision` entity, service, and page at `/artifacts/raid-log`. Same for **Change Management** — the page and data exist but the hub status doesn't reflect reality.

**What to fix:**
- Wire hub cards to actual existing pages
- Update counts to pull from real entities
- Remove "Coming Soon" label from anything that already exists
- Decision Log → `/artifacts/raid-log?tab=decisions`
- Change Management → `/artifacts/changes`

---

### 7. No Cross-Artifact Linking *(Medium)*

A risk in the Risk Register can't reference a RACI task. A decision can't link to a change request. Artifacts live in silos even though in real project management they are deeply interconnected.

**What to build:**
- "Related artifacts" field on any artifact instance — multi-select autocomplete linking to risks, decisions, changes, or other instances from the same project
- Show related artifact count on the hub cards
- Backlinks — when you link A to B, B shows A as related

---

### 8. AI Pre-fill on Document Instances *(Medium)*

The app already uses Groq for MOM generation and War Room post-mortems. When creating an artifact instance (e.g. Project Charter), the AI could pre-fill fields from project context — project name, team members, sprint dates, known risks.

**What to build:**
- "Fill with AI" button on document instances
- Groq call with project context + template structure → returns best-effort first draft
- User reviews and edits before saving
- Works on any template type, not just predefined ones

---

### 9. No Org-Level Compliance View *(Medium)*

All artifacts are project-scoped. There is no way for a PMO to see "which projects are missing a Project Charter?" or "show all COMPLETED Risk Registers across the org."

**What to build:**
- Compliance dashboard at org level: a matrix of projects (rows) vs. artifact types (columns) showing completion status per project
- Filter by artifact type, status, date range
- Export the compliance matrix to Excel
- PMO/ORG_ADMIN access only

---

### 10. No Notifications or Due-Date Awareness *(Low)*

Artifact templates can include date fields but nothing triggers a reminder. "Project Charter review due Friday" does not generate a notification.

**What to build:**
- Due date field type in the form builder that integrates with the notification system
- Configurable reminders (e.g., 3 days before due date)
- Overdue badge on hub cards and artifact instance list

---

## Priority Order

| Priority | Item | Effort | Impact |
|---|---|---|---|
| 1 | Fix the form builder UI | High | Critical — without it templates are unusable |
| 2 | Export RACI to PDF/Excel | Medium | Most-requested in any PM tool |
| 3 | Wire hub "Coming Soon" items | Low | Quick win, removes confusion |
| 4 | RACI validation + summary view | Low | Makes RACI actually correct and useful |
| 5 | Version diff / comparison | Medium | Completes the version control story |
| 6 | Review/approval workflow | Medium | Adds governance layer to documents |
| 7 | AI pre-fill on instances | Medium | Differentiator, reuses existing Groq setup |
| 8 | Cross-artifact linking | Medium | Connects data that already exists |
| 9 | Org-level compliance dashboard | High | Enterprise/PMO value |
| 10 | Notifications / due-date awareness | Low | Completes the artifact lifecycle |

---

## Notes

- The `docx` package is already a backend dependency (used in Standalone MOM export) — DOCX export for artifact instances is lower effort than it appears
- The Groq API key and model are already configured — AI pre-fill reuses existing infrastructure
- The approval model already exists on RACI — the review workflow for documents is a natural extension of what's already built
- The biggest single gap is item #1 — if the form builder has no real UI, the entire template/instance/version system delivers no value to end users
