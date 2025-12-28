import dataSource from '../data-source';

async function fixColumn() {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();

    console.log('Altering created_by column in artifact_instances to allow NULL values...');
    await dataSource.query(
      'ALTER TABLE artifact_instances ALTER COLUMN created_by DROP NOT NULL'
    );

    console.log('✓ Successfully updated artifact_instances table!');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixColumn();
