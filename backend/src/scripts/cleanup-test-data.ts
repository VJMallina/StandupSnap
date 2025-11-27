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
        (SELECT COUNT(*) FROM users WHERE username LIKE 'standuptest%' OR email LIKE 'standuptest%') as test_users,
        (SELECT COUNT(*) FROM projects WHERE name LIKE '%Test Project%' OR name LIKE '%Standup Test%') as test_projects,
        (SELECT COUNT(*) FROM sprints WHERE name LIKE '%Test Sprint%') as test_sprints
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

    // Delete test projects (cascades to sprints, cards, snaps, daily_locks, moms, etc.)
    const projectsDeleted = await dataSource.query(`
      DELETE FROM projects
      WHERE name LIKE '%Test Project%'
         OR name LIKE '%Standup Test%'
         OR description LIKE '%Test project for standup book%'
    `);
    console.log(`   ✓ Deleted test projects and all related data`);

    // Delete test users (cascades to refresh_tokens, project_users, etc.)
    const usersDeleted = await dataSource.query(`
      DELETE FROM users
      WHERE username LIKE 'standuptest%'
         OR email LIKE 'standuptest%'
         OR name LIKE '%Standup Test User%'
    `);
    console.log(`   ✓ Deleted test users and all related data`);

    // Delete orphaned test sprints (if any)
    await dataSource.query(`
      DELETE FROM sprints
      WHERE name LIKE '%Test Sprint%'
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
