import dataSource from '../data-source';

async function fixColumns() {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();

    console.log('Fixing created_by columns in all artifact tables...');

    // Fix artifact_templates
    try {
      await dataSource.query(
        'ALTER TABLE artifact_templates ALTER COLUMN created_by DROP NOT NULL'
      );
      console.log('✓ Fixed artifact_templates.created_by');
    } catch (e) {
      console.log('  artifact_templates.created_by already nullable or doesn\'t exist');
    }

    // Fix artifact_instances
    try {
      await dataSource.query(
        'ALTER TABLE artifact_instances ALTER COLUMN created_by DROP NOT NULL'
      );
      console.log('✓ Fixed artifact_instances.created_by');
    } catch (e) {
      console.log('  artifact_instances.created_by already nullable or doesn\'t exist');
    }

    // Fix artifact_versions
    try {
      await dataSource.query(
        'ALTER TABLE artifact_versions ALTER COLUMN created_by DROP NOT NULL'
      );
      console.log('✓ Fixed artifact_versions.created_by');
    } catch (e) {
      console.log('  artifact_versions.created_by already nullable or doesn\'t exist');
    }

    console.log('\n✓ Successfully updated all artifact tables!');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixColumns();
