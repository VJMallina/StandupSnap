# Projects Module - E2E Test Documentation

## Overview
Comprehensive end-to-end tests for the Projects module covering the complete project lifecycle from creation to deletion.

## Test File
- **File**: `projects-comprehensive.spec.ts`
- **Total Test Groups**: 12
- **Total Test Cases**: ~78

## Test Strategy
- **Single Project Approach**: Uses ONE test project throughout all test cases (reused across tests)
- **Sequential Testing**: Tests follow the natural project lifecycle
- **Comprehensive Coverage**: Covers both positive and negative scenarios

## Test Coverage

### 1. Project Creation - Positive Scenarios (5 tests)
✅ Navigate to create project page
✅ Display all form sections (Basic Info, Timeline, Team Assignment)
✅ Create project with all required fields
✅ Show character count for description (X/500)
✅ Show loading state when creating project

### 2. Team Assignment (6 tests)
✅ Create project with Product Owner assigned (existing user)
✅ Create project with PMO assigned (existing user)
✅ Toggle between "Select Existing" and "Invite New" for Product Owner
✅ Toggle between "Select Existing" and "Invite New" for PMO
✅ Validate email format when inviting team member
✅ Show invitation confirmation in UI

### 3. Project Creation - Negative Scenarios (11 tests)
❌ Error when project name is missing
❌ Error when project name is too short (< 3 chars)
❌ Error when project name is too long (> 100 chars)
❌ Error when start date is missing
❌ Error when end date is missing
❌ Error when end date is before start date
❌ Error when description exceeds 500 characters
❌ Real-time duplicate name validation (debounced 500ms)
❌ Prevent duplicate project name on submit
❌ Clear name error when typing valid name
❌ Show warning color when description > 450 chars

### 4. Project List & Filtering (6 tests)
✅ Display projects in active tab by default
✅ Show project count in tabs
✅ Display project details in table (name, description, date, status)
✅ Show action buttons (View, Edit, Delete)
✅ Switch to archived tab and show empty state
✅ Show "No active projects" empty state

### 5. Project Details View (3 tests)
✅ Navigate to project details page
✅ Display all project information
✅ Back button returns to list

### 6. Project Editing - Positive Scenarios (6 tests)
✅ Navigate to edit page
✅ Pre-fill form with existing project data
✅ Update project name successfully
✅ Update project description
✅ Update project dates
✅ Toggle project active/inactive status
✅ Cancel edit and return to list (no changes saved)

### 7. Project Editing - Negative Scenarios (3 tests)
❌ Error when updating name to duplicate
❌ Validate dates in edit mode
❌ Validate required fields in edit mode

### 8. Project Archive & Unarchive (5 tests)
✅ Archive project successfully
✅ Show archived project in archived tab
✅ Hide edit button for archived projects
✅ Unarchive project (restore to active)
✅ Show unarchived project in active tab

### 9. Project Deletion (4 tests)
✅ Show delete confirmation modal
✅ Cancel deletion and keep project
✅ Delete project successfully
✅ Verify project deleted from both tabs

### 10. Navigation and Error Handling (4 tests)
✅ Navigate back from create page using Cancel
✅ Navigate back from create page using Back button
✅ Handle API errors gracefully
✅ Show loading state in projects list

## Key Features Tested

### Form Validation
- **Name**: Required, 3-100 characters, unique (real-time check)
- **Description**: Optional, max 500 characters
- **Start Date**: Required
- **End Date**: Required, must be after start date
- **Active Toggle**: Boolean, defaults to true
- **Team Assignment**: Optional, with invite functionality

### User Interactions
- Creating projects
- Editing existing projects
- Viewing project details
- Archiving/unarchiving projects
- Deleting projects with confirmation
- Switching between Active/Archived tabs
- Form submission and cancellation
- Team member assignment (PO, PMO)
- Email invitation for team members

### UI Elements
- Loading spinners during async operations
- Character counters for text fields
- Real-time validation feedback
- Error messages with icons
- Confirmation modals
- Tab switching with counts
- Empty states
- Action buttons (View, Edit, Delete)

### Data Persistence
- Project creation persists to database
- Updates reflect immediately in list
- Archive status persists
- Deletion removes from all views

## Running the Tests

⚠️ **CRITICAL**: These tests MUST run with a single worker (`--workers=1`) because they use shared state (one user, one project across all tests). Running with multiple workers will cause failures.

### Run all project tests
```bash
npx playwright test projects-comprehensive.spec.ts --workers=1
```

### Run specific test group
```bash
npx playwright test projects-comprehensive.spec.ts --workers=1 -g "Project Creation - Positive"
```

### Run in headed mode (see browser)
```bash
npx playwright test projects-comprehensive.spec.ts --workers=1 --headed
```

### Run in debug mode
```bash
npx playwright test projects-comprehensive.spec.ts --workers=1 --debug
```

### Run with UI mode
```bash
npx playwright test projects-comprehensive.spec.ts --workers=1 --ui
```

## Test Data

### Valid Project Data
- **Name**: `E2E Test Project {timestamp}`
- **Description**: "Comprehensive end-to-end testing project..."
- **Start Date**: 2025-01-01
- **End Date**: 2025-12-31
- **Active**: true

### Updated Project Data
- **Name**: `Updated E2E Project {timestamp}`
- **Description**: "Updated description for testing edit functionality"
- **Start Date**: 2025-02-01
- **End Date**: 2025-11-30

## Authentication
- Tests create a unique user account before execution
- User credentials: `projecttest{timestamp}@example.com`
- All tests run within the same authenticated session

## Important Notes

### Single Worker Requirement
⚠️ **CRITICAL**: Must run with `--workers=1`
- Tests share a single user account and single project
- Each worker creates its own user, causing state conflicts
- Running with multiple workers will cause `testProjectName is undefined` errors
- Parallel execution breaks test dependencies

### Single Project Strategy
- ✅ **One project** is created at the start of testing
- ✅ This project is **reused** across all test cases
- ✅ Tests modify the same project (name updates, status changes, etc.)
- ✅ Finally deleted at the end of the deletion tests
- ✅ Reduces test execution time and database overhead

### Test Order
Tests are organized to follow a natural lifecycle:
1. **Create** → Test creation with validation
2. **List** → Verify it appears in lists
3. **View** → Check details page
4. **Edit** → Modify project attributes
5. **Archive** → Move to archived state
6. **Delete** → Remove permanently

### Debounced Validation
- Name uniqueness check has **500ms debounce**
- Tests include `waitForTimeout(600)` to ensure validation completes

### Real-time Validation
- Name uniqueness checked on blur/typing (debounced)
- Character counters update live
- Form errors clear when corrected

## Expected Results

### All Tests Should Pass
- ✅ ~78 test cases covering positive and negative scenarios
- ✅ Complete project lifecycle validation
- ✅ All user interactions tested
- ✅ Error handling verified
- ✅ Team assignment functionality tested
- ✅ Archive/unarchive workflow tested

### Performance
- Individual test: ~2-5 seconds
- Full suite: ~4-7 minutes (increased due to additional tests)
- Parallel execution NOT supported (tests are serial and share state)

## Failure Scenarios

If tests fail, check:
1. **Backend API**: Is the backend running on `http://localhost:3000`?
2. **Database**: Are migrations applied?
3. **Frontend**: Is the frontend running on expected port?
4. **Test Data**: Did previous test runs leave orphaned data?
5. **Timing**: Network latency causing timeouts?

## Cleanup

Tests include automatic cleanup:
- User account created for tests
- Project deleted at end of test suite
- No manual cleanup required

## Future Enhancements

Potential additions:
- [ ] Test project member management (adding/removing team members)
- [ ] Test sprint creation from project
- [ ] Test project search/filtering (by name, status, date range)
- [ ] Test project export functionality
- [ ] Test permission-based access (different roles: PO, PMO, Scrum Master)
- [ ] Test project settings/preferences
- [ ] Test project archival with active sprints
- [ ] Test bulk operations (archive multiple, delete multiple)
- [ ] Test email invitation delivery and acceptance flow
- [ ] Test team member role changes within a project

## Maintenance

When updating the projects module:
1. Update tests if UI changes (selectors, text, flow)
2. Add new tests for new features
3. Update validation rules in tests if backend changes
4. Keep test data realistic and representative
