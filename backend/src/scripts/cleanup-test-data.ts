import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Get counts before cleanup
    const beforeCounts = await dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE
          username LIKE 'standuptest%'
          OR email LIKE 'standuptest%'
          OR username LIKE 'sprinttest%'
          OR email LIKE 'sprinttest%@example.com'
          OR username LIKE 'testuser%'
          OR email LIKE 'test%@example.com'
          OR username LIKE 'momtest%'
          OR email LIKE 'momtest%@example.com') as test_users,
        (SELECT COUNT(*) FROM projects WHERE
          name LIKE '%Test Project%'
          OR name LIKE '%Standup Test%'
          OR name LIKE 'E2E Test%'
          OR name LIKE 'Loading Test%'
          OR name LIKE 'Project with%'
          OR name LIKE 'Updated E2E%'
          OR name LIKE 'Auto-Gen Test%'
          OR name LIKE 'Sprint Test%') as test_projects,
        (SELECT COUNT(*) FROM sprints WHERE
          name LIKE '%Test Sprint%'
          OR name LIKE 'Past Sprint%'
          OR name LIKE 'Active Sprint%'
          OR name LIKE 'Completed Sprint%'
          OR name LIKE 'Upcoming Sprint%'
          OR name LIKE 'Auto Sprint%'
          OR name LIKE 'Gap Sprint%') as test_sprints
    `);

    console.log('📊 Test data found:');
    console.log(`   - Users: ${beforeCounts[0].test_users}`);
    console.log(`   - Projects: ${beforeCounts[0].test_projects}`);
    console.log(`   - Sprints: ${beforeCounts[0].test_sprints}`);
    console.log('');

    if (beforeCounts[0].test_users === '0' && beforeCounts[0].test_projects === '0' && beforeCounts[0].test_sprints === '0') {
      console.log('✅ No test data to clean up!');
      await app.close();
      return;
    }

    // Delete test data
    console.log('🗑️  Deleting test data...');

    // First, collect test project IDs for cleanup of related data
    const testProjectIds = await dataSource.query(`
      SELECT id FROM projects
      WHERE name LIKE '%Test Project%'
         OR name LIKE '%Standup Test%'
         OR name LIKE 'E2E Test%'
         OR name LIKE 'Loading Test%'
         OR name LIKE 'Project with%'
         OR name LIKE 'Updated E2E%'
         OR name LIKE 'Auto-Gen Test%'
         OR name LIKE 'Sprint Test%'
         OR description LIKE '%Test project for standup book%'
         OR description LIKE '%Dedicated project for%testing%'
         OR description LIKE '%E2E test%'
    `);

    if (testProjectIds.length > 0) {
      const projectIdList = testProjectIds.map((p: any) => `'${p.id}'`).join(',');

      // Delete project_members for test projects (uses snake_case columns)
      await dataSource.query(`
        DELETE FROM project_members
        WHERE project_id IN (${projectIdList})
      `);

      // Delete artifacts for test projects (if table exists)
      try {
        await dataSource.query(`
          DELETE FROM artifacts
          WHERE project_id IN (${projectIdList})
        `);
      } catch (err: any) {
        // Artifacts table might not exist yet, skip silently
        if (!err.message.includes('does not exist')) {
          throw err;
        }
      }
    }

    // Delete test projects (cascades to sprints, cards, snaps, daily_locks, moms, etc.)
    const projectsDeleted = await dataSource.query(`
      DELETE FROM projects
      WHERE name LIKE '%Test Project%'
         OR name LIKE '%Standup Test%'
         OR name LIKE 'E2E Test%'
         OR name LIKE 'Loading Test%'
         OR name LIKE 'Project with%'
         OR name LIKE 'Updated E2E%'
         OR name LIKE 'Auto-Gen Test%'
         OR name LIKE 'Sprint Test%'
         OR description LIKE '%Test project for standup book%'
         OR description LIKE '%Dedicated project for%testing%'
         OR description LIKE '%E2E test%'
    `);
    console.log(`   ✓ Deleted test projects and all related data`);

    // Collect test user IDs for cleanup
    const testUserIds = await dataSource.query(`
      SELECT id FROM users
      WHERE username LIKE 'standuptest%'
         OR email LIKE 'standuptest%'
         OR username LIKE 'sprinttest%'
         OR email LIKE 'sprinttest%@example.com'
         OR name LIKE '%Test User%'
         OR name LIKE '%Standup Test User%'
         OR name LIKE '%Sprint Test User%'
         OR username LIKE 'testuser%'
         OR email LIKE 'test%@example.com'
         OR username LIKE 'momtest%'
         OR email LIKE 'momtest%@example.com'
    `);

    if (testUserIds.length > 0) {
      const userIdList = testUserIds.map((u: any) => `'${u.id}'`).join(',');

      // Delete refresh_tokens for test users (uses snake_case columns)
      await dataSource.query(`
        DELETE FROM refresh_tokens
        WHERE user_id IN (${userIdList})
      `);

      // Delete remaining project_members for test users (in case they're in non-test projects)
      await dataSource.query(`
        DELETE FROM project_members
        WHERE user_id IN (${userIdList})
      `);
    }

    // Delete test users
    const usersDeleted = await dataSource.query(`
      DELETE FROM users
      WHERE username LIKE 'standuptest%'
         OR email LIKE 'standuptest%'
         OR username LIKE 'sprinttest%'
         OR email LIKE 'sprinttest%@example.com'
         OR name LIKE '%Test User%'
         OR name LIKE '%Standup Test User%'
         OR name LIKE '%Sprint Test User%'
         OR username LIKE 'testuser%'
         OR email LIKE 'test%@example.com'
         OR username LIKE 'momtest%'
         OR email LIKE 'momtest%@example.com'
    `);
    console.log(`   ✓ Deleted test users and all related data`);

    // Delete orphaned test sprints (if any)
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    await dataSource.query(`
      DELETE FROM sprints
      WHERE name LIKE '%Test Sprint%'
         OR name LIKE 'Past Sprint%'
         OR name LIKE 'Active Sprint%'
         OR name LIKE 'Completed Sprint%'
         OR name LIKE 'Upcoming Sprint%'
         OR name LIKE 'Auto Sprint%'
         OR name LIKE 'Gap Sprint%'
    `);
    console.log(`   ✓ Deleted orphaned test sprints`);

    // Get counts after cleanup
    const afterCounts = await dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM sprints) as total_sprints
    `);

    console.log('');
    console.log('✅ Cleanup complete!');
    console.log('');
    console.log('📊 Remaining data in database:');
    console.log(`   - Total Users: ${afterCounts[0].total_users}`);
    console.log(`   - Total Projects: ${afterCounts[0].total_projects}`);
    console.log(`   - Total Sprints: ${afterCounts[0].total_sprints}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the cleanup
cleanupTestData()
  .then(() => {
    console.log('');
    console.log('🎉 Test data cleanup finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
