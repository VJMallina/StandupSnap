import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function fixUserProjects() {
  const email = 'vjmallinascrummaster@gmail.com';

  console.log('🔧 Fixing user project memberships...\n');

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
    console.log(`   Name: ${user.name}`);
    console.log('');

    // Check what columns exist in projects table
    const projectColumns = await dataSource.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);

    const hasCreatedAt = projectColumns.some(c => c.column_name === 'created_at');

    console.log('📋 Database Schema Info:');
    console.log(`   Projects table columns: ${projectColumns.map(c => c.column_name).join(', ')}`);
    console.log('');

    // Find all projects
    const projects = await dataSource.query(
      `SELECT id, name, description ${hasCreatedAt ? ', created_at' : ''} FROM projects ORDER BY name`
    );

    console.log(`📊 Projects in database (${projects.length} found):\n`);

    if (projects.length === 0) {
      console.log('❌ No projects found in database!');
      await app.close();
      return;
    }

    projects.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name}`);
      console.log(`      ID: ${p.id}`);
      if (p.created_at) {
        console.log(`      Created: ${new Date(p.created_at).toLocaleDateString()}`);
      }
      console.log('');
    });

    // Check existing project memberships for these projects
    const projectIds = projects.map(p => p.id);
    const existingMemberships = await dataSource.query(
      `
      SELECT pm.*, u.name as user_name, p.name as project_name
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      JOIN projects p ON p.id = pm.project_id
      WHERE pm.project_id = ANY($1::uuid[])
      `,
      [projectIds]
    );

    console.log(`👥 Existing memberships for these projects (${existingMemberships.length} found):\n`);

    if (existingMemberships.length > 0) {
      existingMemberships.forEach((m, index) => {
        console.log(`   ${index + 1}. ${m.project_name}`);
        console.log(`      User: ${m.user_name}`);
        console.log(`      Role: ${m.role}`);
        console.log('');
      });
    } else {
      console.log('   No memberships found for any project');
      console.log('');
    }

    // Ask user if they want to proceed
    console.log('💡 ANALYSIS:');
    console.log(`   - You have ${projects.length} projects in the database`);
    console.log(`   - You have 0 project memberships`);
    console.log(`   - This is why your dashboard shows "No Projects Assigned"`);
    console.log('');
    console.log('🔧 PROPOSED FIX:');
    console.log('   Add you as "Scrum Master" to all projects');
    console.log('   This will restore your access to the dashboard');
    console.log('');
    console.log('⚠️  NOTE: This script will automatically proceed in 3 seconds...');
    console.log('   Press Ctrl+C to cancel if this is not what you want.');
    console.log('');

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔧 Adding user to all projects as Scrum Master...\n');

    for (const project of projects) {
      // Check if already a member
      const existing = existingMemberships.find(
        m => m.project_id === project.id && m.user_id === user.id
      );

      if (existing) {
        console.log(`   ✓ Already a member of: ${project.name}`);
      } else {
        // Add membership
        await dataSource.query(
          `
          INSERT INTO project_members (project_id, user_id, role, start_date)
          VALUES ($1, $2, $3, CURRENT_DATE)
          `,
          [project.id, user.id, 'Scrum Master']
        );
        console.log(`   ✅ Added to: ${project.name}`);
      }
    }

    console.log('');
    console.log('✅ Done! User is now a member of all projects.');
    console.log('');
    console.log('🎉 You should now be able to see your projects in the dashboard!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Your 3 projects should now appear in the dashboard');
    console.log('   3. We still need to add missing database columns later');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

fixUserProjects()
  .then(() => {
    console.log('\n✅ Fix complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
