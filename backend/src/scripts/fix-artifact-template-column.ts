import dataSource from '../data-source';

async function fixColumn() {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();

    console.log('Altering created_by column to allow NULL values...');
    await dataSource.query(
      'ALTER TABLE artifact_templates ALTER COLUMN created_by DROP NOT NULL'
    );

    console.log('✓ Successfully updated artifact_templates table!');
    console.log('You can now run: npm run seed:artifact-templates');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixColumn();
