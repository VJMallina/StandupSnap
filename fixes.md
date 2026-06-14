# StandupSnap Bug Fixes

---

## Fix: Team Assignment Showing Users from Other Projects

**Date:** 2026-06-14
**Area:** Team Management / Project Creation

### Problem

When adding team members to a project, the "Add Team Member" modal showed users from **other projects** in the dropdown. The source was a freeform `TeamMember` entity pool — creating a profile for Project A made it appear as "available" for Project B (only excluded if already assigned to the current project).

Additionally, there was no connection between actual authenticated org members (users who accepted invitations) and the team assignment flow. Freeform profiles could be created with any name, disconnected from real user accounts.

### Root Cause

The `TeamMember` entity is a standalone virtual profile (`fullName`, `designationRole`, `displayName`) stored per-org schema. `getAvailableTeamMembers()` returned all `TeamMember` records in the schema minus those already in the current project — meaning profiles created for any other project always appeared as "available."

The correct source of truth (`OrgUser` → active org members who accepted invitations) was never used for project team assignment.

### Fix

Replaced the entire team assignment chain from `TeamMember pool → Project` to `OrgUser → ProjectMember`.

| Layer | File | Change |
|---|---|---|
| Backend | `team-member/team-member.module.ts` | Added `OrgUser`, `User` repository imports via `TypeOrmModule.forFeature` |
| Backend | `team-member/team-member.service.ts` | `getAvailableTeamMembers` now queries `public.org_users` for active org members not yet in this project; `addToProject` now creates `ProjectMember` records instead of `TeamMember` ManyMany links; `getProjectTeam` returns all active `ProjectMember`s; added `updateTeamMemberRole` method |
| Backend | `team-member/dto/add-to-project.dto.ts` | Changed `teamMemberIds: string[]` → `userIds: string[]` + optional `designationRole: string` |
| Backend | `project/project.controller.ts` | Added `PATCH /projects/:id/team/:memberId` endpoint to update a member's designation role |
| Frontend | `services/api/teamMembers.ts` | Updated `addToProject(projectId, userIds, designationRole?)`; added `updateProjectMember(projectId, memberId, designationRole)` |
| Frontend | `components/team/AddTeamMemberModal.tsx` | Removed "Create New" freeform mode; now shows org members (name + email) with a designation role selector |
| Frontend | `components/team/EditTeamMemberModal.tsx` | Now edits designation role only (name is read-only — it's a real user); added `projectId` prop; calls `updateProjectMember` |
| Frontend | `components/team/RemoveTeamMemberModal.tsx` | Updated note text to reflect org account is not deleted |
| Frontend | `pages/TeamManagementPage.tsx` | Passes `projectId` to `EditTeamMemberModal`; renamed "Display Name" column to "Email" |

### Correct User Progression (Post-Fix)

```
User registers → Accepts org invitation → Becomes OrgUser (public.org_users)
    → Can be selected for project team (creates ProjectMember in tenant schema)
    → ProjectMember holds: userId, projectId, role (designationRole), orgId
```

Org-level membership is now the single source of truth. Users not in the org cannot appear in any project's team dropdown.
