export enum RoleName {
  SCRUM_MASTER = 'scrum_master',
  PRODUCT_OWNER = 'product_owner',
  PMO = 'pmo',
}

export enum Permission {
  // Project permissions
  CREATE_PROJECT = 'create_project',
  EDIT_PROJECT = 'edit_project',
  DELETE_PROJECT = 'delete_project',
  VIEW_PROJECT = 'view_project',

  // Sprint permissions
  CREATE_SPRINT = 'create_sprint',
  EDIT_SPRINT = 'edit_sprint',
  DELETE_SPRINT = 'delete_sprint',
  VIEW_SPRINT = 'view_sprint',

  // Team member permissions
  ADD_TEAM_MEMBER = 'add_team_member',
  REMOVE_TEAM_MEMBER = 'remove_team_member',
  VIEW_TEAM_MEMBER = 'view_team_member',

  // Standup permissions
  CREATE_STANDUP = 'create_standup',
  EDIT_OWN_STANDUP = 'edit_own_standup',
  EDIT_ANY_STANDUP = 'edit_any_standup',
  DELETE_OWN_STANDUP = 'delete_own_standup',
  DELETE_ANY_STANDUP = 'delete_any_standup',
  VIEW_STANDUP = 'view_standup',

  // Invite permissions
  SEND_INVITE = 'send_invite',
  MANAGE_ROLES = 'manage_roles',
}

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.SCRUM_MASTER]: [
    // Full access to projects
    Permission.CREATE_PROJECT,
    Permission.EDIT_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.VIEW_PROJECT,

    // Full access to sprints
    Permission.CREATE_SPRINT,
    Permission.EDIT_SPRINT,
    Permission.DELETE_SPRINT,
    Permission.VIEW_SPRINT,

    // Full access to team members
    Permission.ADD_TEAM_MEMBER,
    Permission.REMOVE_TEAM_MEMBER,
    Permission.VIEW_TEAM_MEMBER,

    // Full access to standups
    Permission.CREATE_STANDUP,
    Permission.EDIT_OWN_STANDUP,
    Permission.EDIT_ANY_STANDUP,
    Permission.DELETE_OWN_STANDUP,
    Permission.DELETE_ANY_STANDUP,
    Permission.VIEW_STANDUP,

    // Can send invites and manage roles
    Permission.SEND_INVITE,
    Permission.MANAGE_ROLES,
  ],
  [RoleName.PRODUCT_OWNER]: [
    // Full access to projects
    Permission.CREATE_PROJECT,
    Permission.EDIT_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.VIEW_PROJECT,

    // Full access to sprints
    Permission.CREATE_SPRINT,
    Permission.EDIT_SPRINT,
    Permission.DELETE_SPRINT,
    Permission.VIEW_SPRINT,

    // Full access to team members
    Permission.ADD_TEAM_MEMBER,
    Permission.REMOVE_TEAM_MEMBER,
    Permission.VIEW_TEAM_MEMBER,

    // Full access to standups
    Permission.CREATE_STANDUP,
    Permission.EDIT_OWN_STANDUP,
    Permission.EDIT_ANY_STANDUP,
    Permission.DELETE_OWN_STANDUP,
    Permission.DELETE_ANY_STANDUP,
    Permission.VIEW_STANDUP,

    // Can send invites (but not manage roles)
    Permission.SEND_INVITE,
  ],
  [RoleName.PMO]: [
    // View-only access to projects
    Permission.VIEW_PROJECT,

    // View-only access to sprints
    Permission.VIEW_SPRINT,

    // View team members
    Permission.VIEW_TEAM_MEMBER,

    // View standups
    Permission.VIEW_STANDUP,
  ],
};

export const ROLE_LABELS: Record<RoleName, string> = {
  [RoleName.SCRUM_MASTER]: 'Scrum Master',
  [RoleName.PRODUCT_OWNER]: 'Product Owner',
  [RoleName.PMO]: 'PMO',
};

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [RoleName.SCRUM_MASTER]:
    'Full access to the application. Can create projects, manage sprints, add/remove team members, and send invites.',
  [RoleName.PRODUCT_OWNER]:
    'Full access to projects and sprints. Can manage team members and send invites.',
  [RoleName.PMO]:
    'View-only access to all projects, sprints, and team updates.',
};
