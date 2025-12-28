import dataSource from '../data-source';

async function fixDataColumn() {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();

    console.log('\nRemoving default value from artifact_versions.data column...');
    await dataSource.query(
      'ALTER TABLE artifact_versions ALTER COLUMN data DROP DEFAULT'
    );
    console.log('✓ Removed default value');

    console.log('\nMaking data column nullable...');
    await dataSource.query(
      'ALTER TABLE artifact_versions ALTER COLUMN data DROP NOT NULL'
    );
    console.log('✓ Made column nullable');

    console.log('\n✓ Successfully fixed artifact_versions.data column!');
    console.log('\nThe data column will now properly store and retrieve JSONB data.');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

fixDataColumn();
