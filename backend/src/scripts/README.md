# Backend Scripts

This directory contains utility scripts for database maintenance and automation.

## Available Scripts

### Test Data Cleanup

**Purpose**: Removes all test data created by automation tests (E2E/Playwright tests).

**What it removes**:
- **Users** with username/email/name patterns:
  - `standuptest*` (Standup Book E2E tests)
  - `sprinttest*` (Sprint Module E2E tests)
  - `testuser*` (General test users)
  - `test*@example.com` (Test email addresses)
  - `momtest*` (MOM-related tests)
  - Names containing "Test User", "Standup Test User", "Sprint Test User"

- **Projects** with name patterns:
  - `*Test Project*` (All test projects)
  - `*Standup Test*` (Standup-specific test projects)
  - `E2E Test*` (E2E test projects)
  - `Loading Test*` (Loading state test projects)
  - `Project with*` (PO/PMO assignment test projects)
  - `Updated E2E*` (Updated project test cases)
  - `Auto-Gen Test*` (Auto-generation test projects)
  - `Sprint Test*` (Sprint module test projects)

- **Sprints** with name patterns:
  - `*Test Sprint*` (General test sprints)
  - `Past Sprint*`, `Active Sprint*`, `Completed Sprint*`, `Upcoming Sprint*` (Sprint status tests)
  - `Auto Sprint*` (Auto-generated sprint tests)
  - `Gap Sprint*` (Sprint sequencing tests)

- **Related Data** (automatically cleaned via foreign keys or explicit cleanup):
  - Project Members (team assignments - table: `project_members`)
  - Refresh Tokens (authentication - table: `refresh_tokens`)
  - Artifacts (RACI matrices, etc. - table: `artifacts`)
  - Cards (sprint cards)
  - Snaps (daily standups)
  - Daily Locks (standup book locks)
  - MOMs (minutes of meeting)
  - Sprint data (all sprint-related entities)

**Note**: Most related data is automatically deleted via database CASCADE constraints, but the script explicitly cleans `project_members` and `refresh_tokens` to ensure complete cleanup.

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
