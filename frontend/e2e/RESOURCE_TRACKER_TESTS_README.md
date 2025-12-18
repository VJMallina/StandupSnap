# Resource Tracker E2E Tests - Comprehensive Test Suite

## Overview
This test suite provides comprehensive end-to-end testing for the Resource Tracker feature, covering all user scenarios and edge cases.

## File
`frontend/e2e/resource-tracker-comprehensive.spec.ts`

## Test Coverage

### Total Test Cases: 42

**Test Suites:**
1. **RT-UC01: Create Resource** (4 tests)
   - Create Developer with all fields and skills
   - Create QA Lead with custom "Other" role
   - Create underutilized resource (GREEN status)
   - Create overloaded resource (RED status)

2. **RT-UC02: Edit Resource Details** (3 tests)
   - Edit resource name and workload
   - Edit resource role
   - Add and remove skills

3. **RT-UC03 & RT-UC17: Archive Resource** (2 tests)
   - Archive resource
   - View archived resources

4. **RT-UC04: View Resource Register Table** (3 tests)
   - Display all active resources
   - Show empty state
   - Display RAG status correctly

5. **RT-UC14: Filter Resources** (5 tests)
   - Filter by name
   - Filter by role
   - Filter by load percentage range
   - Combine multiple filters
   - Clear all filters

6. **RT-UC15: Sort Resources** (3 tests)
   - Sort by name
   - Sort by load percentage
   - Sort by availability

7. **RT-UC16: View Resource Details** (1 test)
   - Open detail panel

8. **RT-UC19: Manage Resource Workload** (4 tests)
   - Open workload modal
   - Assign workload for weeks
   - Modify availability per week
   - Verify RAG status calculation

9. **Capacity Summary Dashboard** (2 tests)
   - Display summary cards
   - Show correct counts

10. **Resource Heatmap** (1 test)
    - Display heatmap

11. **Export Functionality** (1 test)
    - Export to Excel/CSV

12. **Validation & Error Handling** (4 tests)
    - Validate required fields
    - Validate custom role name
    - Validate availability > 0
    - Validate workload >= 0

13. **Navigation & UI Interactions** (4 tests)
    - Navigate to resource tracker
    - Close modals
    - Toggle archived section
    - Show notes icons

14. **Include Archived Toggle** (1 test)

15. **Skills Management** (2 tests)

16. **Load Percentage Indicators** (1 test)

## Key Fixes Applied

### 1. Correct Route
- **Issue**: Tests were navigating to `/artifacts/resource-tracker`
- **Fix**: Updated to `/artifacts/resources` (the correct route)

### 2. Project Selection
- **Issue**: Resource Tracker requires a project to be selected
- **Fix**: Added `beforeEach` hook that:
  - Logs in the user
  - Sets `selectedProjectId` in localStorage
  - Ensures proper context for each test

### 3. Form Selectors
- **Issue**: Labels weren't properly associated with inputs (no `for` attribute)
- **Fix**: Changed from `getByLabel()` to `getByPlaceholder()`:
  - Resource Name: `getByPlaceholder('e.g., John Doe')`
  - Custom Role: `getByPlaceholder('e.g., DevOps Engineer')`
  - Skills: `getByPlaceholder(/react.*typescript/i)`
  - Notes: `getByPlaceholder(/part-time/i)`

### 4. Number Input Conflicts
- **Issue**: Filter section also has number inputs, causing `nth()` to select wrong elements
- **Fix**: Used specific selector `input[type="number"][step="0.5"]` and accessed last two inputs:
  ```typescript
  const numberInputs = await page.locator('input[type="number"][step="0.5"]').all();
  const availabilityInput = numberInputs[numberInputs.length - 2];
  const workloadInput = numberInputs[numberInputs.length - 1];
  ```

### 5. Role Selector
- **Issue**: Role dropdown not accessible via label
- **Fix**: Used `page.locator('select, [role="combobox"]').nth(0)`

### 6. Custom Role Field Visibility
- **Issue**: Custom role input field not immediately visible after selecting "Other"
- **Fix**: Added wait with timeout:
  ```typescript
  await page.waitForTimeout(500);
  const customRoleInput = page.getByPlaceholder('e.g., DevOps Engineer');
  await expect(customRoleInput).toBeVisible({ timeout: 10000 });
  ```

### 7. RED Text Strict Mode Violation
- **Issue**: `getByText('RED')` matched multiple elements including "AI-Powered Manager"
- **Fix**: Used exact match:
  ```typescript
  await expect(page.getByText('RED', { exact: true })).toBeVisible();
  ```

### 8. Resource Table Loading
- **Issue**: Edit tests failing because resources not found in table
- **Fix**:
  - Increased wait times after creating resources (2000ms)
  - Added explicit waits for table to load
  - Added visibility checks before interacting with rows:
  ```typescript
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  const row = page.locator('tr', { has: page.getByText('Resource Name') });
  await expect(row).toBeVisible({ timeout: 10000 });
  ```

## Running the Tests

```bash
# Run all Resource Tracker tests
npx playwright test resource-tracker-comprehensive.spec.ts --workers=1

# Run in headed mode
npx playwright test resource-tracker-comprehensive.spec.ts --headed --workers=1

# Run specific test suite
npx playwright test resource-tracker-comprehensive.spec.ts -g "Create Resource"

# Run with debug mode
npx playwright test resource-tracker-comprehensive.spec.ts --debug

# Run with timeout
npx playwright test resource-tracker-comprehensive.spec.ts --timeout=60000
```

## Important Notes

1. **Sequential Execution**: Tests should run with `--workers=1` to avoid conflicts
2. **Test Data**: Each test run creates unique test data using timestamps
3. **Cleanup**: Test data persists in the database (consider cleanup scripts)
4. **Dependencies**: Tests depend on the backend API being running and accessible
5. **Timing**: Some tests use `waitForTimeout()` for stability - adjust if needed

## Test Patterns

### Creating a Resource
```typescript
await page.goto('/artifacts/resources');
await page.getByRole('button', { name: /add resource/i }).click();
await page.getByPlaceholder('e.g., John Doe').fill('Resource Name');

const numberInputs = await page.locator('input[type="number"][step="0.5"]').all();
const availabilityInput = numberInputs[numberInputs.length - 2];
const workloadInput = numberInputs[numberInputs.length - 1];
await availabilityInput.fill('40');
await workloadInput.fill('32');

await page.getByRole('button', { name: /create resource/i }).click();
```

### Editing a Resource
```typescript
const row = page.locator('tr', { has: page.getByText('Resource Name') });
await row.hover();
await row.getByTitle('Edit').click();

// Make changes...

await page.getByRole('button', { name: /update resource/i }).click();
```

### Filtering Resources
```typescript
await page.locator('input[placeholder*="Search by name"]').fill('John');
await page.getByRole('button', { name: /apply/i }).click();
```

## Known Limitations

1. Some tests may be timing-dependent
2. Workload assignment modal tests depend on week generation logic
3. Export tests require download permissions
4. Heatmap tests are basic and only verify rendering

## Future Improvements

1. Add visual regression testing for heatmap
2. Add tests for workload history and trends
3. Add tests for bulk operations
4. Add tests for permissions/RBAC
5. Reduce dependency on `waitForTimeout()`
6. Add cleanup hooks to remove test data
