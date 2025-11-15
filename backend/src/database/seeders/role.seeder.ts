import { DataSource } from 'typeorm';
import { Role, RoleName, Permission } from '../../entities/role.entity';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);

  // Define role permissions
  const rolePermissions = {
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

      // Full access to cards
      Permission.CREATE_CARD,
      Permission.EDIT_CARD,
      Permission.DELETE_CARD,
      Permission.VIEW_CARD,

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

      // Full access to cards
      Permission.CREATE_CARD,
      Permission.EDIT_CARD,
      Permission.DELETE_CARD,
      Permission.VIEW_CARD,

      // Can send invites
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

      // View cards
      Permission.VIEW_CARD,
    ],
  };

  // Define role descriptions
  const roleDescriptions = {
    [RoleName.SCRUM_MASTER]:
      'Full access to the application. Can create projects, manage sprints, add/remove team members, and send invites.',
    [RoleName.PRODUCT_OWNER]:
      'Full access to projects and sprints. Can manage team members and send invites.',
    [RoleName.PMO]:
      'View-only access to all projects, sprints, and team updates.',
  };

  // Create or update roles
  for (const roleName of Object.values(RoleName)) {
    let role = await roleRepository.findOne({ where: { name: roleName } });

    if (!role) {
      role = roleRepository.create({
        name: roleName,
        description: roleDescriptions[roleName],
        permissions: rolePermissions[roleName],
      });
      await roleRepository.save(role);
      console.log(`✓ Created role: ${roleName}`);
    } else {
      // Update permissions if role exists
      role.permissions = rolePermissions[roleName];
      role.description = roleDescriptions[roleName];
      await roleRepository.save(role);
      console.log(`✓ Updated role: ${roleName}`);
    }
  }

  console.log('✓ Role seeding completed');
}
