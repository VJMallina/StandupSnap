import { DataSource } from 'typeorm';
import { OrgRole, SystemRoleName } from '../../entities/org-role.entity';
import { PermissionKey } from '../../entities/permission-key.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import {
  PERMISSIONS,
  ALL_PERMISSION_KEYS,
  getPermissionModule,
} from '../../common/constants/permissions';

/**
 * Permission descriptions for the PermissionKey table
 */
const PERMISSION_DESCRIPTIONS: Record<string, { displayName: string; description: string }> = {
  // Project
  [PERMISSIONS.PROJECT_CREATE]: { displayName: 'Create Project', description: 'Create a new project' },
  [PERMISSIONS.PROJECT_VIEW]: { displayName: 'View Projects', description: 'View assigned projects' },
  [PERMISSIONS.PROJECT_VIEW_ALL]: { displayName: 'View All Projects', description: 'View all projects in the org' },
  [PERMISSIONS.PROJECT_EDIT]: { displayName: 'Edit Project', description: 'Edit project name, description, dates' },
  [PERMISSIONS.PROJECT_DELETE]: { displayName: 'Delete Project', description: 'Permanently delete a project' },
  [PERMISSIONS.PROJECT_ARCHIVE]: { displayName: 'Archive Project', description: 'Archive / unarchive a project' },
  [PERMISSIONS.PROJECT_ASSIGN_MEMBERS]: { displayName: 'Assign Members', description: 'Add or remove team members from a project' },
  [PERMISSIONS.PROJECT_SET_MEMBER_ROLE]: { displayName: 'Set Member Role', description: 'Set or change a member\'s project-level role' },
  [PERMISSIONS.PROJECT_SET_CONFIDENTIAL]: { displayName: 'Set Confidential', description: 'Mark project as confidential (ORG_ADMIN only)' },
  [PERMISSIONS.PROJECT_RESTORE_DELETED]: { displayName: 'Restore Deleted', description: 'Restore soft-deleted projects' },

  // Sprint
  [PERMISSIONS.SPRINT_CREATE]: { displayName: 'Create Sprint', description: 'Create a sprint' },
  [PERMISSIONS.SPRINT_VIEW]: { displayName: 'View Sprints', description: 'View sprint details' },
  [PERMISSIONS.SPRINT_EDIT]: { displayName: 'Edit Sprint', description: 'Edit sprint name, goal, dates' },
  [PERMISSIONS.SPRINT_DELETE]: { displayName: 'Delete Sprint', description: 'Delete a sprint' },
  [PERMISSIONS.SPRINT_CLOSE]: { displayName: 'Close Sprint', description: 'Close / complete a sprint' },

  // Card
  [PERMISSIONS.CARD_CREATE]: { displayName: 'Create Card', description: 'Create a card within a sprint' },
  [PERMISSIONS.CARD_VIEW]: { displayName: 'View Cards', description: 'View card details' },
  [PERMISSIONS.CARD_VIEW_ALL]: { displayName: 'View All Cards', description: 'View all cards (not just assigned ones)' },
  [PERMISSIONS.CARD_EDIT]: { displayName: 'Edit Own Card', description: 'Edit own assigned card' },
  [PERMISSIONS.CARD_EDIT_ANY]: { displayName: 'Edit Any Card', description: 'Edit any card regardless of assignee' },
  [PERMISSIONS.CARD_DELETE]: { displayName: 'Delete Card', description: 'Delete a card' },
  [PERMISSIONS.CARD_ASSIGN]: { displayName: 'Assign Card', description: 'Assign or reassign a card' },
  [PERMISSIONS.CARD_CHANGE_STATUS]: { displayName: 'Change Card Status', description: 'Move card through status workflow' },

  // Snap
  [PERMISSIONS.SNAP_CREATE]: { displayName: 'Create Snap', description: 'Submit a daily snap' },
  [PERMISSIONS.SNAP_VIEW_OWN]: { displayName: 'View Own Snaps', description: 'View own snaps' },
  [PERMISSIONS.SNAP_VIEW_ALL]: { displayName: 'View All Snaps', description: 'View all team snaps' },
  [PERMISSIONS.SNAP_EDIT_OWN]: { displayName: 'Edit Own Snaps', description: 'Edit own snaps (before daily lock)' },
  [PERMISSIONS.SNAP_EDIT_ANY]: { displayName: 'Edit Any Snap', description: 'Edit any team member\'s snap' },
  [PERMISSIONS.SNAP_DELETE_OWN]: { displayName: 'Delete Own Snaps', description: 'Delete own snaps (before daily lock)' },
  [PERMISSIONS.SNAP_DELETE_ANY]: { displayName: 'Delete Any Snap', description: 'Delete any snap' },
  [PERMISSIONS.SNAP_LOCK_DAILY]: { displayName: 'Lock Daily Snaps', description: 'Lock all snaps for the day' },
  [PERMISSIONS.SNAP_OVERRIDE_RAG]: { displayName: 'Override RAG', description: 'Override AI-suggested RAG status' },
  [PERMISSIONS.SNAP_GENERATE_SUMMARY]: { displayName: 'Generate Summary', description: 'Trigger AI daily summary generation' },

  // Standup Book
  [PERMISSIONS.STANDUP_BOOK_VIEW]: { displayName: 'View Standup Book', description: 'View the standup book calendar' },
  [PERMISSIONS.STANDUP_BOOK_EXPORT]: { displayName: 'Export Standup Book', description: 'Export standup book to DOCX' },

  // Artifacts - RACI
  [PERMISSIONS.ARTIFACT_RACI_VIEW]: { displayName: 'View RACI', description: 'View RACI matrices' },
  [PERMISSIONS.ARTIFACT_RACI_CREATE]: { displayName: 'Create RACI', description: 'Create a RACI matrix' },
  [PERMISSIONS.ARTIFACT_RACI_EDIT]: { displayName: 'Edit RACI', description: 'Edit RACI entries' },
  [PERMISSIONS.ARTIFACT_RACI_DELETE]: { displayName: 'Delete RACI', description: 'Delete a RACI matrix' },

  // Artifacts - Risk
  [PERMISSIONS.ARTIFACT_RISK_VIEW]: { displayName: 'View Risks', description: 'View risks' },
  [PERMISSIONS.ARTIFACT_RISK_CREATE]: { displayName: 'Create Risk', description: 'Log a new risk' },
  [PERMISSIONS.ARTIFACT_RISK_EDIT]: { displayName: 'Edit Risk', description: 'Edit risk details and mitigation' },
  [PERMISSIONS.ARTIFACT_RISK_DELETE]: { displayName: 'Delete Risk', description: 'Delete a risk' },
  [PERMISSIONS.ARTIFACT_RISK_ARCHIVE]: { displayName: 'Archive Risk', description: 'Archive a closed risk' },
  [PERMISSIONS.ARTIFACT_RISK_EXPORT]: { displayName: 'Export Risks', description: 'Export risk register to CSV' },

  // Artifacts - RAID
  [PERMISSIONS.ARTIFACT_RAID_VIEW]: { displayName: 'View RAID Log', description: 'View the RAID log' },
  [PERMISSIONS.ARTIFACT_ASSUMPTION_CREATE]: { displayName: 'Create Assumption', description: 'Log a new assumption' },
  [PERMISSIONS.ARTIFACT_ASSUMPTION_EDIT]: { displayName: 'Edit Assumption', description: 'Edit an assumption' },
  [PERMISSIONS.ARTIFACT_ASSUMPTION_DELETE]: { displayName: 'Delete Assumption', description: 'Delete an assumption' },
  [PERMISSIONS.ARTIFACT_ISSUE_CREATE]: { displayName: 'Create Issue', description: 'Log a new issue' },
  [PERMISSIONS.ARTIFACT_ISSUE_EDIT]: { displayName: 'Edit Issue', description: 'Edit an issue' },
  [PERMISSIONS.ARTIFACT_ISSUE_DELETE]: { displayName: 'Delete Issue', description: 'Delete an issue' },
  [PERMISSIONS.ARTIFACT_DECISION_CREATE]: { displayName: 'Create Decision', description: 'Log a new decision' },
  [PERMISSIONS.ARTIFACT_DECISION_EDIT]: { displayName: 'Edit Decision', description: 'Edit a decision' },
  [PERMISSIONS.ARTIFACT_DECISION_DELETE]: { displayName: 'Delete Decision', description: 'Delete a decision' },

  // Artifacts - Stakeholder
  [PERMISSIONS.ARTIFACT_STAKEHOLDER_VIEW]: { displayName: 'View Stakeholders', description: 'View stakeholders' },
  [PERMISSIONS.ARTIFACT_STAKEHOLDER_CREATE]: { displayName: 'Create Stakeholder', description: 'Add a stakeholder' },
  [PERMISSIONS.ARTIFACT_STAKEHOLDER_EDIT]: { displayName: 'Edit Stakeholder', description: 'Edit stakeholder details' },
  [PERMISSIONS.ARTIFACT_STAKEHOLDER_DELETE]: { displayName: 'Delete Stakeholder', description: 'Delete a stakeholder' },
  [PERMISSIONS.ARTIFACT_STAKEHOLDER_ARCHIVE]: { displayName: 'Archive Stakeholder', description: 'Archive a stakeholder' },

  // Artifacts - Change
  [PERMISSIONS.ARTIFACT_CHANGE_VIEW]: { displayName: 'View Changes', description: 'View change requests' },
  [PERMISSIONS.ARTIFACT_CHANGE_CREATE]: { displayName: 'Create Change', description: 'Raise a change request' },
  [PERMISSIONS.ARTIFACT_CHANGE_EDIT]: { displayName: 'Edit Change', description: 'Edit a change request' },
  [PERMISSIONS.ARTIFACT_CHANGE_DELETE]: { displayName: 'Delete Change', description: 'Delete a change request' },
  [PERMISSIONS.ARTIFACT_CHANGE_APPROVE]: { displayName: 'Approve Change', description: 'Approve or reject a change request' },
  [PERMISSIONS.ARTIFACT_CHANGE_ARCHIVE]: { displayName: 'Archive Change', description: 'Archive an implemented change' },
  [PERMISSIONS.ARTIFACT_CHANGE_EXPORT]: { displayName: 'Export Changes', description: 'Export change log to CSV' },

  // MOM
  [PERMISSIONS.MOM_VIEW]: { displayName: 'View MOM', description: 'View meeting minutes' },
  [PERMISSIONS.MOM_CREATE]: { displayName: 'Create MOM', description: 'Create a MOM (manual or AI-generated)' },
  [PERMISSIONS.MOM_EDIT]: { displayName: 'Edit MOM', description: 'Edit a MOM' },
  [PERMISSIONS.MOM_DELETE]: { displayName: 'Delete MOM', description: 'Delete a MOM' },
  [PERMISSIONS.MOM_EXPORT]: { displayName: 'Export MOM', description: 'Export MOM to TXT or DOCX' },

  // Reports & Dashboard
  [PERMISSIONS.REPORT_VIEW]: { displayName: 'View Reports', description: 'View project reports' },
  [PERMISSIONS.REPORT_VIEW_ALL]: { displayName: 'View All Reports', description: 'View reports across all org projects' },
  [PERMISSIONS.DASHBOARD_VIEW_TEAM]: { displayName: 'View Team Dashboard', description: 'See team-level dashboard widgets' },
  [PERMISSIONS.DASHBOARD_VIEW_ORG]: { displayName: 'View Org Dashboard', description: 'See org-level RAG and health widgets' },

  // Org Administration
  [PERMISSIONS.USER_INVITE]: { displayName: 'Invite Users', description: 'Invite new users to the org' },
  [PERMISSIONS.USER_DEACTIVATE]: { displayName: 'Deactivate Users', description: 'Deactivate or reactivate a user' },
  [PERMISSIONS.USER_VIEW_ALL]: { displayName: 'View All Users', description: 'View all users in the org' },
  [PERMISSIONS.ROLE_VIEW]: { displayName: 'View Roles', description: 'View all system and custom roles' },
  [PERMISSIONS.ROLE_CREATE]: { displayName: 'Create Role', description: 'Create a custom role' },
  [PERMISSIONS.ROLE_EDIT]: { displayName: 'Edit Role', description: 'Edit a custom role\'s permissions' },
  [PERMISSIONS.ROLE_DELETE]: { displayName: 'Delete Role', description: 'Delete a custom role' },
  [PERMISSIONS.ROLE_ASSIGN]: { displayName: 'Assign Role', description: 'Assign a role to a user' },
  [PERMISSIONS.ORG_SETTINGS_VIEW]: { displayName: 'View Org Settings', description: 'View org settings' },
  [PERMISSIONS.ORG_SETTINGS_EDIT]: { displayName: 'Edit Org Settings', description: 'Edit org name, logo, domain' },
  [PERMISSIONS.BILLING_VIEW]: { displayName: 'View Billing', description: 'View billing and plan details' },
  [PERMISSIONS.BILLING_MANAGE]: { displayName: 'Manage Billing', description: 'Upgrade, downgrade, manage billing' },
  [PERMISSIONS.AUDIT_VIEW]: { displayName: 'View Audit Log', description: 'View the org audit log' },

  // Other modules
  [PERMISSIONS.SCRUM_ROOM_VIEW]: { displayName: 'View Scrum Rooms', description: 'View scrum rooms' },
  [PERMISSIONS.SCRUM_ROOM_CREATE]: { displayName: 'Create Scrum Room', description: 'Create a scrum room' },
  [PERMISSIONS.SCRUM_ROOM_EDIT]: { displayName: 'Edit Scrum Room', description: 'Edit a scrum room' },
  [PERMISSIONS.SCRUM_ROOM_DELETE]: { displayName: 'Delete Scrum Room', description: 'Delete a scrum room' },
  [PERMISSIONS.SCHEDULE_VIEW]: { displayName: 'View Schedule', description: 'View project schedule' },
  [PERMISSIONS.SCHEDULE_CREATE]: { displayName: 'Create Schedule', description: 'Create schedule entries' },
  [PERMISSIONS.SCHEDULE_EDIT]: { displayName: 'Edit Schedule', description: 'Edit schedule entries' },
  [PERMISSIONS.SCHEDULE_DELETE]: { displayName: 'Delete Schedule', description: 'Delete schedule entries' },
  [PERMISSIONS.RESOURCE_VIEW]: { displayName: 'View Resources', description: 'View resource allocation' },
  [PERMISSIONS.RESOURCE_CREATE]: { displayName: 'Create Resource', description: 'Create resource entries' },
  [PERMISSIONS.RESOURCE_EDIT]: { displayName: 'Edit Resource', description: 'Edit resource entries' },
  [PERMISSIONS.RESOURCE_DELETE]: { displayName: 'Delete Resource', description: 'Delete resource entries' },
  [PERMISSIONS.TEAM_MEMBER_VIEW]: { displayName: 'View Team Members', description: 'View team members' },
  [PERMISSIONS.TEAM_MEMBER_ADD]: { displayName: 'Add Team Member', description: 'Add a team member' },
  [PERMISSIONS.TEAM_MEMBER_EDIT]: { displayName: 'Edit Team Member', description: 'Edit a team member' },
  [PERMISSIONS.TEAM_MEMBER_REMOVE]: { displayName: 'Remove Team Member', description: 'Remove a team member' },
};

/**
 * System role definitions with their permission sets
 * Based on StandupSnap_Enterprise_Architecture.md Section 5
 */
const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleName, string[]> = {
  // ORG_ADMIN gets every permission key
  [SystemRoleName.ORG_ADMIN]: ALL_PERMISSION_KEYS,

  // PMO permissions
  [SystemRoleName.PMO]: [
    // Project
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_VIEW_ALL,
    PERMISSIONS.PROJECT_EDIT,
    PERMISSIONS.PROJECT_ARCHIVE,
    PERMISSIONS.PROJECT_ASSIGN_MEMBERS,
    PERMISSIONS.PROJECT_SET_MEMBER_ROLE,
    // Sprint
    PERMISSIONS.SPRINT_CREATE,
    PERMISSIONS.SPRINT_VIEW,
    PERMISSIONS.SPRINT_EDIT,
    PERMISSIONS.SPRINT_CLOSE,
    // Card
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_VIEW,
    PERMISSIONS.CARD_VIEW_ALL,
    PERMISSIONS.CARD_EDIT,
    PERMISSIONS.CARD_EDIT_ANY,
    PERMISSIONS.CARD_ASSIGN,
    PERMISSIONS.CARD_CHANGE_STATUS,
    // Snap
    PERMISSIONS.SNAP_VIEW_ALL,
    PERMISSIONS.SNAP_GENERATE_SUMMARY,
    PERMISSIONS.SNAP_OVERRIDE_RAG,
    // Standup Book
    PERMISSIONS.STANDUP_BOOK_VIEW,
    PERMISSIONS.STANDUP_BOOK_EXPORT,
    // Artifacts
    PERMISSIONS.ARTIFACT_RACI_VIEW,
    PERMISSIONS.ARTIFACT_RACI_CREATE,
    PERMISSIONS.ARTIFACT_RACI_EDIT,
    PERMISSIONS.ARTIFACT_RACI_DELETE,
    PERMISSIONS.ARTIFACT_RISK_VIEW,
    PERMISSIONS.ARTIFACT_RISK_CREATE,
    PERMISSIONS.ARTIFACT_RISK_EDIT,
    PERMISSIONS.ARTIFACT_RISK_ARCHIVE,
    PERMISSIONS.ARTIFACT_RISK_EXPORT,
    PERMISSIONS.ARTIFACT_RAID_VIEW,
    PERMISSIONS.ARTIFACT_ASSUMPTION_CREATE,
    PERMISSIONS.ARTIFACT_ASSUMPTION_EDIT,
    PERMISSIONS.ARTIFACT_ISSUE_CREATE,
    PERMISSIONS.ARTIFACT_ISSUE_EDIT,
    PERMISSIONS.ARTIFACT_DECISION_CREATE,
    PERMISSIONS.ARTIFACT_DECISION_EDIT,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_VIEW,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_CREATE,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_EDIT,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_ARCHIVE,
    PERMISSIONS.ARTIFACT_CHANGE_VIEW,
    PERMISSIONS.ARTIFACT_CHANGE_CREATE,
    PERMISSIONS.ARTIFACT_CHANGE_EDIT,
    PERMISSIONS.ARTIFACT_CHANGE_ARCHIVE,
    PERMISSIONS.ARTIFACT_CHANGE_EXPORT,
    // MOM
    PERMISSIONS.MOM_VIEW,
    PERMISSIONS.MOM_CREATE,
    PERMISSIONS.MOM_EDIT,
    PERMISSIONS.MOM_EXPORT,
    // Reports
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_VIEW_ALL,
    PERMISSIONS.DASHBOARD_VIEW_TEAM,
    PERMISSIONS.DASHBOARD_VIEW_ORG,
    // Team Member
    PERMISSIONS.TEAM_MEMBER_VIEW,
    PERMISSIONS.TEAM_MEMBER_ADD,
    PERMISSIONS.TEAM_MEMBER_EDIT,
    // Scrum Room
    PERMISSIONS.SCRUM_ROOM_VIEW,
    PERMISSIONS.SCRUM_ROOM_CREATE,
    PERMISSIONS.SCRUM_ROOM_EDIT,
    // Schedule
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.SCHEDULE_CREATE,
    PERMISSIONS.SCHEDULE_EDIT,
    // Resource
    PERMISSIONS.RESOURCE_VIEW,
    PERMISSIONS.RESOURCE_CREATE,
    PERMISSIONS.RESOURCE_EDIT,
  ],

  // SCRUM_MASTER permissions
  [SystemRoleName.SCRUM_MASTER]: [
    // Project
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_ASSIGN_MEMBERS,
    PERMISSIONS.PROJECT_SET_MEMBER_ROLE,
    // Sprint
    PERMISSIONS.SPRINT_CREATE,
    PERMISSIONS.SPRINT_VIEW,
    PERMISSIONS.SPRINT_EDIT,
    PERMISSIONS.SPRINT_CLOSE,
    PERMISSIONS.SPRINT_DELETE,
    // Card
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_VIEW,
    PERMISSIONS.CARD_VIEW_ALL,
    PERMISSIONS.CARD_EDIT,
    PERMISSIONS.CARD_EDIT_ANY,
    PERMISSIONS.CARD_ASSIGN,
    PERMISSIONS.CARD_CHANGE_STATUS,
    PERMISSIONS.CARD_DELETE,
    // Snap
    PERMISSIONS.SNAP_CREATE,
    PERMISSIONS.SNAP_VIEW_OWN,
    PERMISSIONS.SNAP_VIEW_ALL,
    PERMISSIONS.SNAP_EDIT_OWN,
    PERMISSIONS.SNAP_EDIT_ANY,
    PERMISSIONS.SNAP_DELETE_OWN,
    PERMISSIONS.SNAP_DELETE_ANY,
    PERMISSIONS.SNAP_LOCK_DAILY,
    PERMISSIONS.SNAP_OVERRIDE_RAG,
    PERMISSIONS.SNAP_GENERATE_SUMMARY,
    // Standup Book
    PERMISSIONS.STANDUP_BOOK_VIEW,
    PERMISSIONS.STANDUP_BOOK_EXPORT,
    // Artifacts
    PERMISSIONS.ARTIFACT_RACI_VIEW,
    PERMISSIONS.ARTIFACT_RACI_CREATE,
    PERMISSIONS.ARTIFACT_RACI_EDIT,
    PERMISSIONS.ARTIFACT_RISK_VIEW,
    PERMISSIONS.ARTIFACT_RISK_CREATE,
    PERMISSIONS.ARTIFACT_RISK_EDIT,
    PERMISSIONS.ARTIFACT_RISK_ARCHIVE,
    PERMISSIONS.ARTIFACT_RISK_EXPORT,
    PERMISSIONS.ARTIFACT_RAID_VIEW,
    PERMISSIONS.ARTIFACT_ASSUMPTION_CREATE,
    PERMISSIONS.ARTIFACT_ASSUMPTION_EDIT,
    PERMISSIONS.ARTIFACT_ISSUE_CREATE,
    PERMISSIONS.ARTIFACT_ISSUE_EDIT,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_VIEW,
    PERMISSIONS.ARTIFACT_CHANGE_VIEW,
    PERMISSIONS.ARTIFACT_CHANGE_CREATE,
    // MOM
    PERMISSIONS.MOM_VIEW,
    PERMISSIONS.MOM_CREATE,
    PERMISSIONS.MOM_EDIT,
    PERMISSIONS.MOM_EXPORT,
    // Reports
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.DASHBOARD_VIEW_TEAM,
    // Team Member
    PERMISSIONS.TEAM_MEMBER_VIEW,
    PERMISSIONS.TEAM_MEMBER_ADD,
    PERMISSIONS.TEAM_MEMBER_EDIT,
    PERMISSIONS.TEAM_MEMBER_REMOVE,
    // Scrum Room
    PERMISSIONS.SCRUM_ROOM_VIEW,
    PERMISSIONS.SCRUM_ROOM_CREATE,
    PERMISSIONS.SCRUM_ROOM_EDIT,
    PERMISSIONS.SCRUM_ROOM_DELETE,
    // Schedule
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.SCHEDULE_CREATE,
    PERMISSIONS.SCHEDULE_EDIT,
    // Resource
    PERMISSIONS.RESOURCE_VIEW,
    PERMISSIONS.RESOURCE_CREATE,
    PERMISSIONS.RESOURCE_EDIT,
  ],

  // PRODUCT_OWNER permissions
  [SystemRoleName.PRODUCT_OWNER]: [
    // Project
    PERMISSIONS.PROJECT_VIEW,
    // Sprint
    PERMISSIONS.SPRINT_VIEW,
    // Card
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_VIEW,
    PERMISSIONS.CARD_VIEW_ALL,
    PERMISSIONS.CARD_EDIT,
    PERMISSIONS.CARD_ASSIGN,
    PERMISSIONS.CARD_CHANGE_STATUS,
    // Snap
    PERMISSIONS.SNAP_CREATE,
    PERMISSIONS.SNAP_VIEW_OWN,
    PERMISSIONS.SNAP_EDIT_OWN,
    PERMISSIONS.SNAP_DELETE_OWN,
    PERMISSIONS.SNAP_VIEW_ALL,
    // Standup Book
    PERMISSIONS.STANDUP_BOOK_VIEW,
    // Artifacts
    PERMISSIONS.ARTIFACT_RACI_VIEW,
    PERMISSIONS.ARTIFACT_RACI_CREATE,
    PERMISSIONS.ARTIFACT_RACI_EDIT,
    PERMISSIONS.ARTIFACT_RISK_VIEW,
    PERMISSIONS.ARTIFACT_RAID_VIEW,
    PERMISSIONS.ARTIFACT_DECISION_CREATE,
    PERMISSIONS.ARTIFACT_DECISION_EDIT,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_VIEW,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_CREATE,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_EDIT,
    PERMISSIONS.ARTIFACT_STAKEHOLDER_ARCHIVE,
    PERMISSIONS.ARTIFACT_CHANGE_VIEW,
    PERMISSIONS.ARTIFACT_CHANGE_CREATE,
    PERMISSIONS.ARTIFACT_CHANGE_APPROVE,
    PERMISSIONS.ARTIFACT_CHANGE_EXPORT,
    // MOM
    PERMISSIONS.MOM_VIEW,
    PERMISSIONS.MOM_CREATE,
    PERMISSIONS.MOM_EDIT,
    PERMISSIONS.MOM_EXPORT,
    // Reports
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.DASHBOARD_VIEW_TEAM,
    // Team Member
    PERMISSIONS.TEAM_MEMBER_VIEW,
    // Scrum Room
    PERMISSIONS.SCRUM_ROOM_VIEW,
    // Schedule
    PERMISSIONS.SCHEDULE_VIEW,
    // Resource
    PERMISSIONS.RESOURCE_VIEW,
  ],

  // MEMBER permissions
  [SystemRoleName.MEMBER]: [
    // Project
    PERMISSIONS.PROJECT_VIEW,
    // Sprint
    PERMISSIONS.SPRINT_VIEW,
    // Card
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_VIEW,
    PERMISSIONS.CARD_VIEW_ALL,
    PERMISSIONS.CARD_EDIT,
    PERMISSIONS.CARD_CHANGE_STATUS,
    // Snap
    PERMISSIONS.SNAP_CREATE,
    PERMISSIONS.SNAP_VIEW_OWN,
    PERMISSIONS.SNAP_VIEW_ALL,
    PERMISSIONS.SNAP_EDIT_OWN,
    PERMISSIONS.SNAP_DELETE_OWN,
    // Standup Book
    PERMISSIONS.STANDUP_BOOK_VIEW,
    // Artifacts (read + participate in RAID log)
    PERMISSIONS.ARTIFACT_RAID_VIEW,
    // MOM
    PERMISSIONS.MOM_VIEW,
    // Reports
    PERMISSIONS.REPORT_VIEW,
    // Team Member
    PERMISSIONS.TEAM_MEMBER_VIEW,
    // Scrum Room
    PERMISSIONS.SCRUM_ROOM_VIEW,
  ],

  // VIEWER permissions
  [SystemRoleName.VIEWER]: [
    // Project
    PERMISSIONS.PROJECT_VIEW,
    // Sprint
    PERMISSIONS.SPRINT_VIEW,
    // Card (read only)
    PERMISSIONS.CARD_VIEW,
    // Snap (view all, read only)
    PERMISSIONS.SNAP_VIEW_ALL,
    // Standup Book
    PERMISSIONS.STANDUP_BOOK_VIEW,
    // Reports
    PERMISSIONS.REPORT_VIEW,
    // Team Member
    PERMISSIONS.TEAM_MEMBER_VIEW,
    // Scrum Room
    PERMISSIONS.SCRUM_ROOM_VIEW,
    // MOM (read only)
    PERMISSIONS.MOM_VIEW,
    // RAID Artifacts (read only)
    PERMISSIONS.ARTIFACT_RAID_VIEW,
  ],
};

/**
 * System role descriptions
 */
const SYSTEM_ROLE_DESCRIPTIONS: Record<SystemRoleName, string> = {
  [SystemRoleName.ORG_ADMIN]: 'Full access to everything. Can manage users, roles, billing, and all org settings.',
  [SystemRoleName.PMO]: 'Program/Portfolio Management Office. Can view all projects and generate reports across the org.',
  [SystemRoleName.SCRUM_MASTER]: 'Manages sprints, daily standups, and team coordination for assigned projects.',
  [SystemRoleName.PRODUCT_OWNER]: 'Manages product backlog, priorities, and stakeholder relationships.',
  [SystemRoleName.MEMBER]: 'Team member who can submit snaps and update their assigned cards.',
  [SystemRoleName.VIEWER]: 'Read-only access to project information and reports.',
};

/**
 * Seeds the PermissionKey table with all permission keys
 */
async function seedPermissionKeys(dataSource: DataSource): Promise<void> {
  const permissionKeyRepo = dataSource.getRepository(PermissionKey);

  let sortOrder = 0;
  for (const key of ALL_PERMISSION_KEYS) {
    const existing = await permissionKeyRepo.findOne({ where: { key } });
    const desc = PERMISSION_DESCRIPTIONS[key] || { displayName: key, description: '' };
    const module = getPermissionModule(key);

    if (!existing) {
      await permissionKeyRepo.save({
        key,
        module,
        displayName: desc.displayName,
        description: desc.description,
        isActive: true,
        sortOrder: sortOrder++,
      });
      console.log(`  ✓ Created permission key: ${key}`);
    } else {
      existing.module = module;
      existing.displayName = desc.displayName;
      existing.description = desc.description;
      existing.sortOrder = sortOrder++;
      await permissionKeyRepo.save(existing);
    }
  }

  console.log(`✓ Seeded ${ALL_PERMISSION_KEYS.length} permission keys`);
}

/**
 * Seeds the OrgRole table with system roles
 */
async function seedSystemRoles(dataSource: DataSource): Promise<Map<SystemRoleName, string>> {
  const orgRoleRepo = dataSource.getRepository(OrgRole);
  const roleIdMap = new Map<SystemRoleName, string>();

  for (const roleName of Object.values(SystemRoleName)) {
    let role = await orgRoleRepo.findOne({
      where: {
        name: roleName,
        isSystem: true,
        organizationId: null as any, // TypeORM quirk for null check
      },
    });

    if (!role) {
      role = orgRoleRepo.create({
        name: roleName,
        description: SYSTEM_ROLE_DESCRIPTIONS[roleName],
        isSystem: true,
        isEditable: false,
        organizationId: null,
        createdById: null,
      });
      await orgRoleRepo.save(role);
      console.log(`  ✓ Created system role: ${roleName}`);
    } else {
      role.description = SYSTEM_ROLE_DESCRIPTIONS[roleName];
      await orgRoleRepo.save(role);
    }

    roleIdMap.set(roleName, role.id);
  }

  console.log(`✓ Seeded ${Object.values(SystemRoleName).length} system roles`);
  return roleIdMap;
}

/**
 * Seeds the RolePermission junction table
 */
async function seedRolePermissions(
  dataSource: DataSource,
  roleIdMap: Map<SystemRoleName, string>,
): Promise<void> {
  const rolePermissionRepo = dataSource.getRepository(RolePermission);

  for (const [roleName, permissions] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const roleId = roleIdMap.get(roleName as SystemRoleName);
    if (!roleId) continue;

    // Delete existing permissions for this role (to handle updates)
    await rolePermissionRepo.delete({ orgRoleId: roleId });

    // Insert new permissions
    const rolePermissions = permissions.map((permissionKey) => ({
      orgRoleId: roleId,
      permissionKey,
    }));

    await rolePermissionRepo.save(rolePermissions);
    console.log(`  ✓ Assigned ${permissions.length} permissions to ${roleName}`);
  }

  console.log('✓ Seeded role permissions');
}

/**
 * Main seeder function for enterprise roles and permissions
 */
export async function seedEnterpriseRoles(dataSource: DataSource): Promise<void> {
  console.log('\n🔐 Seeding Enterprise Roles and Permissions...\n');

  // Step 1: Seed permission keys
  console.log('📋 Seeding permission keys...');
  await seedPermissionKeys(dataSource);

  // Step 2: Seed system roles
  console.log('\n👥 Seeding system roles...');
  const roleIdMap = await seedSystemRoles(dataSource);

  // Step 3: Seed role permissions
  console.log('\n🔗 Seeding role permissions...');
  await seedRolePermissions(dataSource, roleIdMap);

  console.log('\n✅ Enterprise roles seeding completed!\n');
}
