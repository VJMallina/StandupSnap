import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function debugProjects() {
  console.log('🔍 Starting project visibility debug...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Check all projects
    const projects = await dataSource.query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p."createdAt",
        p."isActive",
        p."isArchived"
      FROM projects p
      ORDER BY p."createdAt" DESC
      LIMIT 10
    `);

    console.log('📊 Recent Projects:');
    console.log('==================');
    if (projects.length === 0) {
      console.log('   No projects found in database');
    } else {
      projects.forEach((p: any, index: number) => {
        console.log(`\n${index + 1}. ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Created: ${p.createdAt}`);
        console.log(`   Active: ${p.isActive}`);
        console.log(`   Archived: ${p.isArchived}`);
      });
    }

    console.log('\n\n📊 Project Members:');
    console.log('==================');

    // Check project_members with user details
    const projectMembers = await dataSource.query(`
      SELECT
        pm.id as membership_id,
        pm.role,
        pm."isActive" as membership_active,
        pm."createdAt" as joined_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.username,
        p.id as project_id,
        p.name as project_name
      FROM project_members pm
      INNER JOIN users u ON pm.user_id = u.id
      INNER JOIN projects p ON pm.project_id = p.id
      ORDER BY pm."createdAt" DESC
      LIMIT 20
    `);

    if (projectMembers.length === 0) {
      console.log('   No project members found');
    } else {
      projectMembers.forEach((pm: any, index: number) => {
        console.log(`\n${index + 1}. ${pm.user_name} (${pm.user_email})`);
        console.log(`   User ID: ${pm.user_id}`);
        console.log(`   Username: ${pm.username}`);
        console.log(`   Project: ${pm.project_name}`);
        console.log(`   Project ID: ${pm.project_id}`);
        console.log(`   Role: ${pm.role}`);
        console.log(`   Membership Active: ${pm.membership_active}`);
        console.log(`   Joined: ${pm.joined_at}`);
      });
    }

    // Check for orphaned projects (projects without any members)
    console.log('\n\n📊 Projects WITHOUT Members:');
    console.log('============================');

    const orphanedProjects = await dataSource.query(`
      SELECT
        p.id,
        p.name,
        p."createdAt"
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.id IS NULL
      ORDER BY p."createdAt" DESC
    `);

    if (orphanedProjects.length === 0) {
      console.log('   ✓ All projects have at least one member');
    } else {
      console.log(`   ⚠️  Found ${orphanedProjects.length} projects without members:`);
      orphanedProjects.forEach((p: any) => {
        console.log(`   - ${p.name} (ID: ${p.id}, Created: ${p.createdAt})`);
      });
    }

    // Check for users with scrum master role
    console.log('\n\n📊 Users with Scrum Master Role:');
    console.log('=================================');

    const scrumMasters = await dataSource.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.username,
        COUNT(pm.id) as project_count
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON ur.role_id = r.id
      LEFT JOIN project_members pm ON pm.user_id = u.id AND pm."isActive" = true
      WHERE r.name = 'scrummaster'
      GROUP BY u.id, u.name, u.email, u.username
      ORDER BY u."createdAt" DESC
    `);

    if (scrumMasters.length === 0) {
      console.log('   No scrum masters found');
    } else {
      scrumMasters.forEach((sm: any) => {
        console.log(`\n   ${sm.name} (${sm.email})`);
        console.log(`   User ID: ${sm.id}`);
        console.log(`   Username: ${sm.username}`);
        console.log(`   Active Projects: ${sm.project_count}`);
      });
    }

    console.log('\n\n✅ Debug complete!\n');

  } catch (error: any) {
    console.error('❌ Error during debug:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the debug
debugProjects()
  .then(() => {
    console.log('🎉 Debug finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
