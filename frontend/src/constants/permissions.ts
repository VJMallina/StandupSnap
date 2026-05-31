/**
 * Permission keys - mirrors backend/src/common/constants/permissions.ts
 *
 * These are the permission keys used throughout the application.
 * Use these constants instead of hardcoded strings for type safety.
 */
export const PERMISSIONS = {
  // Project Management
  PROJECT_CREATE: 'project:create',
  PROJECT_VIEW: 'project:view',
  PROJECT_VIEW_ALL: 'project:view_all',
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',
  PROJECT_ARCHIVE: 'project:archive',
  PROJECT_ASSIGN_MEMBERS: 'project:assign_members',
  PROJECT_SET_MEMBER_ROLE: 'project:set_member_role',
  PROJECT_SET_CONFIDENTIAL: 'project:set_confidential',
  PROJECT_RESTORE_DELETED: 'project:restore_deleted',

  // Sprint Management
  SPRINT_CREATE: 'sprint:create',
  SPRINT_VIEW: 'sprint:view',
  SPRINT_EDIT: 'sprint:edit',
  SPRINT_DELETE: 'sprint:delete',
  SPRINT_CLOSE: 'sprint:close',

  // Card Management
  CARD_CREATE: 'card:create',
  CARD_VIEW: 'card:view',
  CARD_VIEW_ALL: 'card:view_all',
  CARD_EDIT: 'card:edit',
  CARD_EDIT_ANY: 'card:edit_any',
  CARD_DELETE: 'card:delete',
  CARD_ASSIGN: 'card:assign',
  CARD_CHANGE_STATUS: 'card:change_status',

  // Snap Management
  SNAP_CREATE: 'snap:create',
  SNAP_VIEW_OWN: 'snap:view_own',
  SNAP_VIEW_ALL: 'snap:view_all',
  SNAP_EDIT_OWN: 'snap:edit_own',
  SNAP_EDIT_ANY: 'snap:edit_any',
  SNAP_DELETE_OWN: 'snap:delete_own',
  SNAP_DELETE_ANY: 'snap:delete_any',
  SNAP_LOCK_DAILY: 'snap:lock_daily',
  SNAP_OVERRIDE_RAG: 'snap:override_rag',
  SNAP_GENERATE_SUMMARY: 'snap:generate_summary',

  // Standup Book
  STANDUP_BOOK_VIEW: 'standup_book:view',
  STANDUP_BOOK_EXPORT: 'standup_book:export',

  // Artifacts - RACI
  ARTIFACT_RACI_VIEW: 'artifact:raci:view',
  ARTIFACT_RACI_CREATE: 'artifact:raci:create',
  ARTIFACT_RACI_EDIT: 'artifact:raci:edit',
  ARTIFACT_RACI_DELETE: 'artifact:raci:delete',

  // Artifacts - Risk
  ARTIFACT_RISK_VIEW: 'artifact:risk:view',
  ARTIFACT_RISK_CREATE: 'artifact:risk:create',
  ARTIFACT_RISK_EDIT: 'artifact:risk:edit',
  ARTIFACT_RISK_DELETE: 'artifact:risk:delete',
  ARTIFACT_RISK_ARCHIVE: 'artifact:risk:archive',
  ARTIFACT_RISK_EXPORT: 'artifact:risk:export',

  // Artifacts - RAID
  ARTIFACT_RAID_VIEW: 'artifact:raid:view',
  ARTIFACT_ASSUMPTION_CREATE: 'artifact:assumption:create',
  ARTIFACT_ASSUMPTION_EDIT: 'artifact:assumption:edit',
  ARTIFACT_ASSUMPTION_DELETE: 'artifact:assumption:delete',
  ARTIFACT_ISSUE_CREATE: 'artifact:issue:create',
  ARTIFACT_ISSUE_EDIT: 'artifact:issue:edit',
  ARTIFACT_ISSUE_DELETE: 'artifact:issue:delete',
  ARTIFACT_DECISION_CREATE: 'artifact:decision:create',
  ARTIFACT_DECISION_EDIT: 'artifact:decision:edit',
  ARTIFACT_DECISION_DELETE: 'artifact:decision:delete',

  // Artifacts - Stakeholder
  ARTIFACT_STAKEHOLDER_VIEW: 'artifact:stakeholder:view',
  ARTIFACT_STAKEHOLDER_CREATE: 'artifact:stakeholder:create',
  ARTIFACT_STAKEHOLDER_EDIT: 'artifact:stakeholder:edit',
  ARTIFACT_STAKEHOLDER_DELETE: 'artifact:stakeholder:delete',
  ARTIFACT_STAKEHOLDER_ARCHIVE: 'artifact:stakeholder:archive',

  // Artifacts - Change
  ARTIFACT_CHANGE_VIEW: 'artifact:change:view',
  ARTIFACT_CHANGE_CREATE: 'artifact:change:create',
  ARTIFACT_CHANGE_EDIT: 'artifact:change:edit',
  ARTIFACT_CHANGE_DELETE: 'artifact:change:delete',
  ARTIFACT_CHANGE_APPROVE: 'artifact:change:approve',
  ARTIFACT_CHANGE_ARCHIVE: 'artifact:change:archive',
  ARTIFACT_CHANGE_EXPORT: 'artifact:change:export',

  // MOM
  MOM_VIEW: 'mom:view',
  MOM_CREATE: 'mom:create',
  MOM_EDIT: 'mom:edit',
  MOM_DELETE: 'mom:delete',
  MOM_EXPORT: 'mom:export',

  // Reports & Dashboard
  REPORT_VIEW: 'report:view',
  REPORT_VIEW_ALL: 'report:view_all',
  REPORT_CREATE: 'report:create',
  REPORT_EDIT: 'report:edit',
  REPORT_DELETE: 'report:delete',
  DASHBOARD_VIEW_TEAM: 'dashboard:view_team',
  DASHBOARD_VIEW_ORG: 'dashboard:view_org',

  // Scrum Room
  SCRUM_ROOM_VIEW: 'scrum_room:view',
  SCRUM_ROOM_CREATE: 'scrum_room:create',
  SCRUM_ROOM_EDIT: 'scrum_room:edit',
  SCRUM_ROOM_DELETE: 'scrum_room:delete',

  // Schedule
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_EDIT: 'schedule:edit',
  SCHEDULE_DELETE: 'schedule:delete',

  // Resource
  RESOURCE_VIEW: 'resource:view',
  RESOURCE_CREATE: 'resource:create',
  RESOURCE_EDIT: 'resource:edit',
  RESOURCE_DELETE: 'resource:delete',

  // Team Member
  TEAM_MEMBER_VIEW: 'team_member:view',
  TEAM_MEMBER_ADD: 'team_member:add',
  TEAM_MEMBER_EDIT: 'team_member:edit',
  TEAM_MEMBER_REMOVE: 'team_member:remove',

  // User Management
  USER_INVITE: 'user:invite',
  USER_DEACTIVATE: 'user:deactivate',
  USER_VIEW_ALL: 'user:view_all',

  // Role Management
  ROLE_VIEW: 'role:view',
  ROLE_CREATE: 'role:create',
  ROLE_EDIT: 'role:edit',
  ROLE_DELETE: 'role:delete',
  ROLE_ASSIGN: 'role:assign',

  // Org Settings
  ORG_SETTINGS_VIEW: 'org:settings:view',
  ORG_SETTINGS_EDIT: 'org:settings:edit',

  // Billing
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',

  // Audit
  AUDIT_VIEW: 'audit:view',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];
