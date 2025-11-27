# Backend Scripts

This directory contains utility scripts for database maintenance and automation.

## Available Scripts

### Test Data Cleanup

**Purpose**: Removes all test data created by automation tests (E2E/Playwright tests).

**What it removes**:
- Users with username/email containing `standuptest`
- Projects with names containing "Test Project" or "Standup Test"
- Sprints with names containing "Test Sprint"
- All related data (cascading deletes):
  - Cards
  - Snaps
  - Daily Locks
  - MOMs
  - Project Users
  - Refresh Tokens
  - etc.

**Usage**:
```bash
cd backend
npm run cleanup:test-data
```

**When to use**:
- After running E2E tests multiple times
- Before running fresh test suites
- To clean up failed test runs
- To free up database space from test data

**Safety**:
- ✅ Only removes test data (identified by naming patterns)
- ✅ Preserves all real user data
- ✅ Shows counts before and after cleanup
- ✅ Safe to run anytime

**Example output**:
```
🧹 Starting test data cleanup...

📊 Test data found:
   - Users: 15
   - Projects: 8
   - Sprints: 12

🗑️  Deleting test data...
   ✓ Deleted test projects and all related data
   ✓ Deleted test users and all related data
   ✓ Deleted orphaned test sprints

✅ Cleanup complete!

📊 Remaining data in database:
   - Total Users: 5
   - Total Projects: 3
   - Total Sprints: 4

🎉 Test data cleanup finished successfully!
```

## Adding New Scripts

To add a new script:

1. Create a new `.ts` file in this directory
2. Use NestJS application context for database access
3. Add the script to `package.json`:
   ```json
   "script-name": "ts-node -r tsconfig-paths/register src/scripts/your-script.ts"
   ```
4. Document it in this README

## Best Practices

- Always show counts/summaries before performing destructive operations
- Use clear console output with emojis for readability
- Handle errors gracefully with try-catch blocks
- Close the NestJS application context when done
- Use proper exit codes (0 for success, 1 for failure)
