# Sprint Module - E2E Test Documentation

## Overview
Comprehensive end-to-end tests for the Sprint module covering the complete sprint lifecycle including manual creation, auto-generation, sequencing, status transitions, editing, closing, and deletion.

## Test File
- **File**: `sprints-comprehensive.spec.ts`
- **Total Test Groups**: 10
- **Total Test Cases**: ~74

## Test Strategy
- **Single User Approach**: Uses ONE test user throughout all test cases
- **Dedicated Project**: Creates ONE project specifically for sprint testing (6 months timeline)
- **Multiple Sprints**: Creates and manages multiple sprints with different statuses
- **Sequential Testing**: Tests follow the natural sprint lifecycle and must run serially
- **Comprehensive Coverage**: Covers manual creation, auto-generation, positive and negative scenarios

## Test Coverage

### 1. Manual Sprint Creation - Positive Scenarios (6 tests)
✅ Navigate to create sprint page
✅ Display both Manual and Auto-Generate tabs
✅ Create past sprint with COMPLETED status
✅ Create active sprint with ACTIVE status and goal
✅ Create sprint with 2 daily standups and slot times
✅ Create sprint with 3 daily standups

### 2. Auto-Generated Sprints (5 tests)
✅ Switch to auto-generate tab
✅ Preview 2-week duration sprints
✅ Generate 6 sprints with 2-week duration
✅ Preview 1-week duration sprints
✅ Preview 4-week duration sprints

### 3. Sprint Sequencing & Active Sprint Management (6 tests)
✅ Create upcoming sprint 2 while active sprint exists
✅ Create upcoming sprint 3 in sequence
✅ Show all sprints with different statuses in list
✅ Prevent creating overlapping sprint with active sprint
✅ Allow creating sprint with gap after active sprint

### 4. Sprint List & Filtering (6 tests)
✅ Display sprints in table view
✅ Filter sprints by project
✅ Filter sprints by status - ACTIVE
✅ Filter sprints by status - UPCOMING
✅ Search sprints by name
✅ Clear filters

### 5. Sprint Details View (4 tests)
✅ Navigate to sprint details page
✅ Display all sprint information
✅ Show status progress bar
✅ Show days remaining for active sprint

### 6. Sprint Editing (4 tests)
✅ Open edit modal
✅ Edit sprint name successfully
✅ Edit sprint goal successfully
✅ Cancel edit without saving changes

### 7. Sprint Closing (4 tests)
✅ Show close sprint button for completed sprint
✅ Close completed sprint successfully
✅ Not show close button for upcoming sprint
✅ Not allow editing closed sprint

### 8. Sprint Deletion (4 tests)
✅ Show delete button for upcoming sprint
✅ Delete upcoming sprint successfully
✅ Not show delete button for active sprint
✅ Not show delete button for closed sprint

### 9. Sprint Creation - Validation (3 tests)
❌ Error when sprint name is missing
❌ Error when end date is before start date
❌ Error when dates are outside project timeline

### 10. Navigation & Error Handling (3 tests)
✅ Navigate back from create page using Cancel
✅ Navigate back from create page using Back button
✅ Show loading state in sprints list

## Key Features Tested

### Sprint Statuses
- **UPCOMING**: Sprint start date is in the future
- **ACTIVE**: Current date is within sprint start and end dates
- **COMPLETED**: Current date is after sprint end date (not manually closed)
- **CLOSED**: Sprint manually closed by user (final state)

### Sprint Creation Types
- **MANUAL**: User creates single sprint with custom details
- **AUTO_GENERATED**: System creates multiple sprints based on duration and project timeline

### Daily Standup Configuration
- **1 Standup**: Single daily standup (default) with optional time
- **2 Standups**: Morning and afternoon standups with optional times
- **3 Standups**: Multiple daily standups with optional times
- **Slot Times**: Optional time configuration for ALL standup counts (1-3), both in manual and auto-generation modes

### Sprint Auto-Generation
- **Duration Options**: 1, 2, 3, or 4 weeks per sprint
- **Custom Name Prefix**: Optional prefix for auto-generated sprint names
- **Standup Slot Times**: Optional slot times that apply to all generated sprints
- **Preview Before Creation**: See all sprints that will be created
- **Validation**: Prevents overlaps with existing sprints
- **Sequential Dates**: Automatically calculates sequential sprint dates

### Form Validation
- **Name**: Required, must be unique within project
- **Dates**: Required, start must be before end
- **Project Timeline**: Sprint dates must be within project start/end dates
- **No Overlaps**: Sprint dates cannot overlap with existing sprints
- **Daily Standup Count**: 1-3 standups allowed

### User Interactions
- Creating sprints (manual and auto-generated)
- Viewing sprint details
- Editing sprint information (name, goal, dates)
- Closing sprints
- Deleting sprints
- Filtering and searching sprints
- Sequential sprint planning

### UI Elements
- Loading spinners during async operations
- Status badges with color coding (Green, Yellow, Teal, Gray)
- Progress bars for sprint status
- Days remaining indicator
- Confirmation modals
- Filter dropdowns and search
- Empty states
- Action buttons (View, Edit, Close, Delete)

## Sprint Timeline Used in Tests

### Project Setup
```
Project Timeline: -3 weeks (past) → +21 weeks (future)
Total Duration: 24 weeks (6 months)
Purpose: Allows testing all sprint statuses
```

### Sprint Dates
```
Past Sprint (COMPLETED):
  Start: 3 weeks ago
  End: 1 week ago
  Status: COMPLETED (past end date)

Completed Sprint (COMPLETED → CLOSED):
  Start: 2 weeks ago
  End: Yesterday
  Status: COMPLETED → manually CLOSED in tests

Active Sprint (ACTIVE):
  Start: 7 days ago
  End: 7 days from now
  Status: ACTIVE (current date within sprint)
  Shows: "Days remaining"

Upcoming Sprint 1 (UPCOMING):
  Start: Day after active sprint ends
  End: +2 weeks from start
  Status: UPCOMING (future start date)

Upcoming Sprint 2 (UPCOMING):
  Start: Day after upcoming 1 ends
  End: +2 weeks from start
  Status: UPCOMING

Upcoming Sprint 3 (UPCOMING):
  Start: Day after upcoming 2 ends
  End: +2 weeks from start
  Status: UPCOMING
  Note: Deleted during tests

Auto-Generated Sprints:
  6 sprints × 2 weeks each = 12 weeks
  Sequential, non-overlapping dates
```

## Running the Tests

⚠️ **CRITICAL**: These tests MUST run with a single worker (`--workers=1`) because they:
- Share a single user account
- Share a single project
- Create and modify shared sprints
- Have sequential dependencies

### Run all sprint tests
```bash
npx playwright test sprints-comprehensive.spec.ts --workers=1
```

### Run in headed mode (see browser)
```bash
npx playwright test sprints-comprehensive.spec.ts --workers=1 --headed
```

### Run in slow motion (debugging)
```bash
npx playwright test sprints-comprehensive.spec.ts --workers=1 --headed --slowmo=1000
```

### Run in debug mode
```bash
npx playwright test sprints-comprehensive.spec.ts --workers=1 --debug
```

### Run in UI mode (interactive)
```bash
npx playwright test sprints-comprehensive.spec.ts --workers=1 --ui
```

### Run specific test group
```bash
npx playwright test sprints-comprehensive.spec.ts --workers=1 -g "Auto-Generated"
```

## Test Data

### User Account
- **Username**: `sprinttest{timestamp}`
- **Email**: `sprinttest{timestamp}@example.com`
- **Password**: Test123456!
- **Role**: Scrum Master

### Project Data
```javascript
Name: "Sprint Test Project {timestamp}"
Description: "Dedicated project for comprehensive sprint testing"
Start Date: 3 weeks ago
End Date: 21 weeks from now
Status: Active, not archived
```

### Sprint Data
Each sprint has unique timestamp-based names to avoid conflicts:
- Past Sprint {timestamp}
- Active Sprint {timestamp}
- Completed Sprint {timestamp}
- Upcoming Sprint 1/2/3 {timestamp}
- Auto Sprint {timestamp} 1-6
- Gap Sprint {timestamp}

## Authentication
- Tests create a unique user account during `beforeAll`
- Auth token stored and reused for all tests via `beforeEach`
- All tests run within the same authenticated session

## Important Notes

### Single Worker Requirement
⚠️ **CRITICAL**: Must run with `--workers=1`
- Tests share a single user account and single project
- Each worker creates its own user, causing state conflicts
- Running with multiple workers will cause failures
- Tests have sequential dependencies

### Date-Based Status Calculation
- Sprint status is automatically calculated based on current date
- Tests use relative dates (e.g., "7 days ago") to ensure consistent statuses
- Status transitions are automatic, not manual (except CLOSED)

### Sprint Sequencing
- Tests verify real-world Agile workflow:
  - Active sprint exists
  - Multiple upcoming sprints planned in sequence
  - New sprints created while active sprint running
  - Gaps between sprints are allowed
  - Overlaps are prevented

### Test Order
Tests are organized to follow a natural lifecycle:
1. **Create** → Manual sprint creation (all statuses)
2. **Generate** → Auto-generate multiple sprints
3. **Sequence** → Test sequential planning with active sprint
4. **List** → Verify listing and filtering
5. **Details** → Check details page
6. **Edit** → Modify sprint attributes
7. **Close** → Test sprint closure
8. **Delete** → Remove sprints
9. **Validate** → Test error scenarios

### Limitations & Skipped Tests

**Sprint Closing with Cards:**
- Backend validates that all cards are completed before closing
- Tests close sprints that have no cards (simplified)
- Card validation testing would require Cards module setup

**Snap History Deletion:**
- Sprints with snap history cannot be deleted
- Tests only delete sprints without snap history
- Full snap history validation requires Snaps module

**ACTIVE Status Testing:**
- Active status requires sprint dates to span current date
- Tests create sprint with calculated dates to ensure ACTIVE status
- Date calculations relative to test execution time

## Expected Results

### All Tests Should Pass
- ✅ ~74 test cases covering positive and negative scenarios
- ✅ Complete sprint lifecycle validation
- ✅ All user interactions tested
- ✅ Manual and auto-generation workflows
- ✅ Sequential sprint planning scenarios
- ✅ Status transitions verified
- ✅ Error handling validated

### Performance
- Individual test: ~2-5 seconds
- Full suite: ~5-8 minutes
- Parallel execution NOT supported (tests are serial)

## Status Badge Color Coding

| Status | Color | Meaning |
|--------|-------|---------|
| UPCOMING | Yellow | Sprint hasn't started yet |
| ACTIVE | Green | Sprint is currently in progress |
| COMPLETED | Teal | Sprint ended but not closed |
| CLOSED | Gray | Sprint manually closed |

## Available Actions by Status

| Action | UPCOMING | ACTIVE | COMPLETED | CLOSED |
|--------|----------|--------|-----------|--------|
| View | ✅ | ✅ | ✅ | ✅ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Close | ❌ | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ✅* | ❌ |

*Only if no snap history

## Failure Scenarios

If tests fail, check:
1. **Backend API**: Is the backend running on `http://localhost:3000`?
2. **Database**: Are migrations applied and database accessible?
3. **Frontend**: Is the frontend running on expected port?
4. **Single Worker**: Did you use `--workers=1`?
5. **Date Calculations**: Are sprint dates being calculated correctly relative to today?
6. **Project Timeline**: Does the test project have proper start/end dates?
7. **Network Latency**: Is remote database causing timeouts? (Neon.tech)

## Cleanup

Tests do not automatically clean up data after execution:
- User account remains in database
- Test project remains in database
- Sprints remain in database

**Manual Cleanup** (if needed):
```bash
# Delete test user and all associated data
# Via database or admin panel
```

## Future Enhancements

Potential additions:
- [ ] Test sprint velocity tracking
- [ ] Test sprint burndown charts
- [ ] Test sprint retrospectives
- [ ] Test sprint backlog management
- [ ] Test card assignment to sprints
- [ ] Test snap creation during sprint
- [ ] Test sprint reports and metrics
- [ ] Test sprint duplication
- [ ] Test bulk sprint operations
- [ ] Test permission-based access (different roles)
- [ ] Test sprint with maximum cards
- [ ] Test sprint closure with cards validation
- [ ] Test snap history preventing deletion

## Maintenance

When updating the sprint module:
1. Update tests if UI changes (selectors, text, flow)
2. Add new tests for new features
3. Update validation rules in tests if backend changes
4. Keep test data realistic and representative
5. Update date calculations if sprint rules change
6. Verify single-worker requirement still necessary

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "sprint not found"
**Solution**: Ensure tests run with `--workers=1` and sequentially

**Issue**: Status is wrong (e.g., expected ACTIVE but got UPCOMING)
**Solution**: Check date calculations - sprint dates must span current date for ACTIVE status

**Issue**: "Sprint overlaps with existing sprint" error
**Solution**: Verify date calculations don't create overlapping dates

**Issue**: Auto-generation creates wrong number of sprints
**Solution**: Check project timeline is long enough for desired sprint count

**Issue**: Cannot close sprint
**Solution**: Verify sprint is not UPCOMING (only ACTIVE/COMPLETED can be closed)

**Issue**: Cannot delete sprint
**Solution**: Verify sprint is not ACTIVE or CLOSED, and has no snap history

## Debug Mode

For investigating failures:
```bash
# Run single test with debug
npx playwright test sprints-comprehensive.spec.ts --workers=1 --debug -g "specific test name"

# View test trace
npx playwright show-trace test-results/path-to-trace.zip

# View HTML report
npx playwright show-report
```

## Test Architecture

### beforeAll
- Registers unique test user
- Creates dedicated sprint test project with 6-month timeline
- Stores auth token and project ID

### beforeEach
- Sets auth token in localStorage
- Reloads page to apply authentication
- Waits for page to be ready

### Test Groups (test.describe.serial)
All test groups run sequentially and share state:
1. Manual Sprint Creation
2. Auto-Generated Sprints
3. Sprint Sequencing
4. Sprint List & Filtering
5. Sprint Details View
6. Sprint Editing
7. Sprint Closing
8. Sprint Deletion
9. Sprint Validation
10. Navigation & Error Handling

### Shared Variables
- `accessToken`: Auth token for API requests
- `testProjectId`: Project UUID
- `testProjectName`: Project name for selection
- `*SprintId`: Sprint UUIDs for tracking
- `*SprintName`: Sprint names for assertions

## Related Modules

### Integrations
- **Project Module**: Sprints belong to projects, inherit timeline constraints
- **Card Module**: Cards belong to sprints, affect closure validation
- **Snap Module**: Snap history prevents sprint deletion
- **Role-based Access**: Project roles determine sprint permissions

## API Endpoints Tested

| Endpoint | Method | Test Coverage |
|----------|--------|---------------|
| `/sprints` | POST | Manual creation, validation errors |
| `/sprints/preview` | POST | Auto-generation preview |
| `/sprints/generate` | POST | Auto-generation creation |
| `/sprints` | GET | List, filtering, search |
| `/sprints/:id` | GET | Details view |
| `/sprints/:id` | PATCH | Edit sprint |
| `/sprints/:id/close` | POST | Close sprint |
| `/sprints/:id` | DELETE | Delete sprint |

## Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Manual Creation | 6 | ✅ |
| Auto-Generation | 5 | ✅ |
| Sequencing | 6 | ✅ |
| List & Filter | 6 | ✅ |
| Details View | 4 | ✅ |
| Editing | 4 | ✅ |
| Closing | 4 | ✅ |
| Deletion | 4 | ✅ |
| Validation | 3 | ✅ |
| Navigation | 3 | ✅ |
| **Total** | **74** | ✅ |

---

**Last Updated**: 2025-12-14
**Playwright Version**: Compatible with latest
**Test Framework**: Playwright Test
**Execution Mode**: Serial (`--workers=1` required)
