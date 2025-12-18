import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function checkUserProjects() {
  const email = 'vjmallinascrummaster@gmail.com';

  console.log('🔍 Checking user projects...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Find user by email
    const users = await dataSource.query(
      `SELECT id, username, email, name FROM users WHERE email = $1`,
      [email]
    );

    if (users.length === 0) {
      console.log('❌ User not found with email:', email);
      await app.close();
      return;
    }

    const user = users[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log('');

    // Check which columns exist
    const pmColumnCheck = await dataSource.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'project_members' AND column_name = 'is_active'
    `);

    const projectColumnCheck = await dataSource.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name IN ('is_active', 'is_archived')
    `);

    const hasPmIsActive = pmColumnCheck.length > 0;
    const hasProjectIsActive = projectColumnCheck.some(c => c.column_name === 'is_active');
    const hasProjectIsArchived = projectColumnCheck.some(c => c.column_name === 'is_archived');

    if (!hasPmIsActive) {
      console.log('⚠️  Note: is_active column not found in project_members table');
      console.log('   Treating all memberships as active');
      console.log('');
    }

    if (!hasProjectIsActive || !hasProjectIsArchived) {
      console.log('⚠️  Note: Missing columns in projects table:');
      if (!hasProjectIsActive) console.log('   - is_active not found');
      if (!hasProjectIsArchived) console.log('   - is_archived not found');
      console.log('   Your database schema needs to be updated!');
      console.log('');
    }

    // Check project memberships
    const memberships = await dataSource.query(
      `
      SELECT
        pm.id as membership_id,
        pm.role as membership_role,
        ${hasPmIsActive ? 'pm.is_active,' : 'true as is_active,'}
        p.id as project_id,
        p.name as project_name,
        p.description
        ${hasProjectIsActive ? ', p.is_active as project_is_active' : ', true as project_is_active'}
        ${hasProjectIsArchived ? ', p.is_archived as project_is_archived' : ', false as project_is_archived'}
      FROM project_members pm
      JOIN projects p ON p.id = pm.project_id
      WHERE pm.user_id = $1
      ORDER BY p.name
      `,
      [user.id]
    );

    console.log(`📊 Project Memberships (${memberships.length} found):\n`);

    if (memberships.length === 0) {
      console.log('   ⚠️  No project memberships found for this user');
      console.log('   This means the user is not assigned to any projects');
    } else {
      memberships.forEach((m, index) => {
        console.log(`   ${index + 1}. ${m.project_name}`);
        console.log(`      Project ID: ${m.project_id}`);
        console.log(`      Membership Role: ${m.membership_role}`);
        console.log(`      Membership Active: ${m.is_active ? '✅ Yes' : '❌ No'}`);
        console.log(`      Project Active: ${m.project_is_active ? '✅ Yes' : '❌ No'}`);
        console.log(`      Project Archived: ${m.project_is_archived ? '📦 Yes' : '✅ No'}`);
        console.log('');
      });
    }

    // Check if memberships are inactive
    const inactiveMemberships = memberships.filter(m => !m.is_active);
    if (inactiveMemberships.length > 0) {
      console.log('⚠️  WARNING: Some memberships are inactive!');
      console.log(`   ${inactiveMemberships.length} inactive memberships found`);
      console.log('   These projects will NOT appear in the dashboard');
      console.log('');
    }

    // Summary
    const activeMemberships = memberships.filter(m => m.is_active);
    console.log('📋 Summary:');
    console.log(`   Total Memberships: ${memberships.length}`);
    console.log(`   Active Memberships: ${activeMemberships.length}`);
    console.log(`   Inactive Memberships: ${inactiveMemberships.length}`);
    console.log('');

    if (activeMemberships.length > 0) {
      console.log('✅ Dashboard should show these projects:');
      activeMemberships.forEach(m => {
        console.log(`   - ${m.project_name}`);
      });
    } else {
      console.log('❌ No active memberships - Dashboard will show "No Projects Assigned"');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

checkUserProjects()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
