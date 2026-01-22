import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function fixOrphanedProjects() {
  console.log('🔧 Fixing orphaned projects...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Find projects without members
    const orphanedProjects = await dataSource.query(`
      SELECT DISTINCT
        p.id as project_id,
        p.name as project_name,
        p."createdAt"
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.id IS NULL
      ORDER BY p."createdAt" DESC
    `);

    if (orphanedProjects.length === 0) {
      console.log('✅ No orphaned projects found - all projects have members!');
      await app.close();
      return;
    }

    console.log(`Found ${orphanedProjects.length} projects without members:\n`);
    orphanedProjects.forEach((p: any, index: number) => {
      console.log(`${index + 1}. ${p.project_name}`);
      console.log(`   Created: ${p.createdAt}`);
    });

    console.log('\n📋 Available users:');
    console.log('===================');

    // Get all users
    const users = await dataSource.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.username,
        string_agg(r.name::text, ', ') as roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id, u.name, u.email, u.username
      ORDER BY u."createdAt" DESC
    `);

    if (users.length === 0) {
      console.log('   No users found in the system');
      await app.close();
      return;
    }

    users.forEach((u: any, index: number) => {
      console.log(`\n${index + 1}. ${u.name} (${u.email})`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Username: ${u.username}`);
      console.log(`   Roles: ${u.roles || 'None'}`);
    });

    console.log('\n\n🤔 Which user should be added to these orphaned projects?');
    console.log('   (Usually the Scrum Master who created them)\n');

    // For automated fix, we'll add the first user with a role
    const defaultUser = users.find((u: any) => u.roles?.includes('Scrum Master')) || users[0];

    if (!defaultUser) {
      console.log('❌ No suitable user found to assign as project member');
      await app.close();
      return;
    }

    console.log(`🔧 Adding "${defaultUser.name}" to all orphaned projects...\n`);

    for (const project of orphanedProjects) {
      // Add the user as a project member
      await dataSource.query(`
        INSERT INTO project_members (id, project_id, user_id, role, "startDate", "isActive", "createdAt", "updatedAt")
        VALUES (
          uuid_generate_v4(),
          $1,
          $2,
          'Scrum Master',
          CURRENT_DATE,
          true,
          NOW(),
          NOW()
        )
      `, [project.project_id, defaultUser.id]);

      console.log(`   ✓ Added ${defaultUser.name} to "${project.project_name}"`);
    }

    console.log('\n✅ All orphaned projects fixed!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Projects fixed: ${orphanedProjects.length}`);
    console.log(`   - Added as member: ${defaultUser.name} (${defaultUser.email})`);

    // Verify fix
    const stillOrphaned = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.id IS NULL
    `);

    if (stillOrphaned[0].count === '0') {
      console.log(`\n✅ Verification: All projects now have members!`);
    } else {
      console.log(`\n⚠️  Warning: ${stillOrphaned[0].count} projects still without members`);
    }

  } catch (error: any) {
    console.error('❌ Error during fix:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the fix
fixOrphanedProjects()
  .then(() => {
    console.log('\n🎉 Fix completed successfully!');
    console.log('   You can now refresh your dashboard to see the projects.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
