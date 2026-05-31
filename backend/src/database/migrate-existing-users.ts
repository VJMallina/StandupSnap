import { DataSource, IsNull } from 'typeorm';
import * as dotenv from 'dotenv';
import { Organization, OrganizationPlan, DomainPolicy } from '../entities/organization.entity';
import { OrgUser } from '../entities/org-user.entity';
import { OrgRole, SystemRoleName } from '../entities/org-role.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';

// Load environment variables
dotenv.config();

const DEFAULT_ORG_NAME = 'Default Organization';
const DEFAULT_ORG_SLUG = 'default';

/**
 * Migration script to move existing users into a default organization
 *
 * This script:
 * 1. Creates a default organization if it doesn't exist
 * 2. Maps existing user roles to org roles
 * 3. Creates OrgUser records for all existing users
 * 4. Updates all projects with organizationId
 * 5. Updates all project members with organizationId
 */
async function migrateExistingUsers() {
  console.log('🔄 Starting migration of existing users to default organization...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'standupsnap',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const orgRepo = dataSource.getRepository(Organization);
    const orgUserRepo = dataSource.getRepository(OrgUser);
    const orgRoleRepo = dataSource.getRepository(OrgRole);
    const userRepo = dataSource.getRepository(User);
    const projectRepo = dataSource.getRepository(Project);
    const projectMemberRepo = dataSource.getRepository(ProjectMember);

    // Step 1: Get or create default organization
    console.log('📁 Setting up default organization...');
    let defaultOrg = await orgRepo.findOne({
      where: { slug: DEFAULT_ORG_SLUG },
    });

    if (!defaultOrg) {
      defaultOrg = orgRepo.create({
        name: DEFAULT_ORG_NAME,
        slug: DEFAULT_ORG_SLUG,
        plan: OrganizationPlan.FREE,
        domainPolicy: DomainPolicy.INVITE_ONLY,
        description: 'Default organization for migrated users',
        isActive: true,
      });
      await orgRepo.save(defaultOrg);
      console.log(`  ✓ Created default organization: ${DEFAULT_ORG_NAME}`);
    } else {
      console.log(`  ✓ Using existing organization: ${defaultOrg.name}`);
    }

    // Step 2: Get system roles
    console.log('\n👥 Fetching system roles...');
    const systemRoles = await orgRoleRepo.find({
      where: { isSystem: true },
    });

    const roleMap = new Map<string, OrgRole>();
    for (const role of systemRoles) {
      roleMap.set(role.name, role);
      console.log(`  ✓ Found role: ${role.name}`);
    }

    // Step 3: Get all users with their legacy roles
    console.log('\n👤 Migrating users...');
    const users = await userRepo.find({
      relations: ['roles'],
    });

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if user already has org membership
      const existingMembership = await orgUserRepo.findOne({
        where: {
          userId: user.id,
          organizationId: defaultOrg.id,
        },
      });

      if (existingMembership) {
        skippedCount++;
        continue;
      }

      // Map legacy role to org role
      const legacyRoleName = user.roles?.[0]?.name?.toUpperCase();
      let orgRole: OrgRole | undefined;

      // Role mapping logic
      if (legacyRoleName === 'SCRUM_MASTER') {
        orgRole = roleMap.get(SystemRoleName.SCRUM_MASTER);
      } else if (legacyRoleName === 'PRODUCT_OWNER') {
        orgRole = roleMap.get(SystemRoleName.PRODUCT_OWNER);
      } else if (legacyRoleName === 'PMO') {
        orgRole = roleMap.get(SystemRoleName.PMO);
      } else {
        // Default to MEMBER for unknown roles
        orgRole = roleMap.get(SystemRoleName.MEMBER);
      }

      if (!orgRole) {
        console.log(`  ⚠ No role mapping found for user ${user.username}, using MEMBER`);
        orgRole = roleMap.get(SystemRoleName.MEMBER);
      }

      // Create org user record
      const orgUser = orgUserRepo.create({
        organizationId: defaultOrg.id,
        userId: user.id,
        orgRoleId: orgRole!.id,
        isActive: true,
      });

      await orgUserRepo.save(orgUser);
      migratedCount++;
      console.log(`  ✓ Migrated user: ${user.username} → ${orgRole!.name}`);
    }

    console.log(`\n  📊 Users migrated: ${migratedCount}, Skipped (already migrated): ${skippedCount}`);

    // Step 4: Update projects with organizationId
    console.log('\n📂 Updating projects with organization...');
    const projects = await projectRepo.find({
      where: { organizationId: IsNull() },
    });

    let projectsUpdated = 0;
    for (const project of projects) {
      project.organizationId = defaultOrg.id;
      await projectRepo.save(project);
      projectsUpdated++;
    }
    console.log(`  ✓ Updated ${projectsUpdated} projects`);

    // Step 5: Update project members with organizationId
    console.log('\n👥 Updating project members with organization...');
    const projectMembers = await projectMemberRepo.find({
      where: { organizationId: IsNull() },
    });

    let membersUpdated = 0;
    for (const member of projectMembers) {
      member.organizationId = defaultOrg.id;
      await projectMemberRepo.save(member);
      membersUpdated++;
    }
    console.log(`  ✓ Updated ${membersUpdated} project members`);

    // Step 6: Make first user ORG_ADMIN if no admin exists
    console.log('\n👑 Checking for organization admin...');
    const adminRole = roleMap.get(SystemRoleName.ORG_ADMIN);
    const existingAdmin = await orgUserRepo.findOne({
      where: {
        organizationId: defaultOrg.id,
        orgRoleId: adminRole?.id,
        isActive: true,
      },
    });

    if (!existingAdmin && users.length > 0) {
      // Find the first user (by creation date) and make them admin
      const firstUser = users.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];

      const firstUserMembership = await orgUserRepo.findOne({
        where: {
          userId: firstUser.id,
          organizationId: defaultOrg.id,
        },
      });

      if (firstUserMembership && adminRole) {
        firstUserMembership.orgRoleId = adminRole.id;
        await orgUserRepo.save(firstUserMembership);
        console.log(`  ✓ Promoted ${firstUser.username} to ORG_ADMIN`);
      }
    } else if (existingAdmin) {
      console.log('  ✓ Organization already has an admin');
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Organization: ${defaultOrg.name} (${defaultOrg.slug})`);
    console.log(`   - Users migrated: ${migratedCount}`);
    console.log(`   - Projects updated: ${projectsUpdated}`);
    console.log(`   - Project members updated: ${membersUpdated}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n📡 Database connection closed');
    }
  }
}

// Run the migration
migrateExistingUsers();
