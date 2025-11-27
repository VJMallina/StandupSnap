# E2E Tests for StandupSnap

## Test Files

### ✅ `standupbook-simple.spec.ts` (Recommended)
**Status**: Working reliably
**Purpose**: Complete standup book functionality tests
**Tests**: 5 focused tests

**What it tests**:
- Authentication flow
- Standup book page access
- Project/Sprint viewing with slot support
- Day details with slot grouping
- Lock enforcement across Cards view

**Usage**:
```bash
npx playwright test standupbook-simple.spec.ts
```

**Advantages**:
- ✅ Uses ONE user for all tests (registered once in beforeAll)
- ✅ Uses ONE project for all tests (created once, reused)
- ✅ Tests slot selection (2 slots per day)
- ✅ Tests lock enforcement
- ✅ Reliable and fast
- ✅ Easy to debug

---

### ⚠️ `standupbook.spec.ts` (Comprehensive but Fragile)
**Status**: Has authentication issues
**Purpose**: Comprehensive standup book testing
**Tests**: 16 detailed tests

**Issues**:
- Authentication state not persisting reliably
- Complex `beforeAll`/`beforeEach` setup
- Tests interfere with each other
- Flaky due to timing issues

**Not recommended** until authentication mechanism is fixed.

---

### ✅ `auth.spec.ts`
**Status**: Working
**Purpose**: Authentication and user management tests

**Usage**:
```bash
npx playwright test auth.spec.ts
```

---

### ✅ `protected-routes.spec.ts`
**Status**: Working
**Purpose**: Route protection and RBAC tests

**Usage**:
```bash
npx playwright test protected-routes.spec.ts
```

## Recommendations

### For Regular Testing
Use the simple test suite:
```bash
npx playwright test standupbook-simple.spec.ts
```

### For Full Test Suite
```bash
npx playwright test
```

### For Debugging
```bash
npx playwright test standupbook-simple.spec.ts --debug
```

### For UI Mode (Visual Testing)
```bash
npx playwright test standupbook-simple.spec.ts --ui
```

## Test Data Cleanup

After running tests multiple times, clean up test data:

```bash
cd ../backend
npm run cleanup:test-data
```

Or use the batch file:
```bash
cd ../backend
cleanup-test-data.bat
```

## Writing New Tests

### Best Practices

1. **Use Simple Authentication**
   ```typescript
   test.beforeEach(async ({ page }) => {
     await page.goto('/register');
     // Register user...
     await page.waitForURL('/', { timeout: 15000 });
   });
   ```

2. **Create Test Data via API**
   ```typescript
   const token = await page.evaluate(() => localStorage.getItem('accessToken'));
   const response = await request.post('http://localhost:3000/api/projects', {
     headers: { Authorization: `Bearer ${token}` },
     data: { /* project data */ },
   });
   ```

3. **Use Unique IDs**
   ```typescript
   const uniqueId = Date.now();
   const testUsername = `user${uniqueId}`;
   ```

4. **Add Appropriate Waits**
   ```typescript
   await page.waitForTimeout(1000); // For API calls to complete
   await element.waitFor({ state: 'visible' }); // For elements
   ```

5. **Use Flexible Selectors**
   ```typescript
   const selector = page.locator('select, [role="combobox"]').first();
   ```

### Anti-Patterns to Avoid

❌ Shared authentication across tests
❌ Complex `beforeAll` setup
❌ Tests depending on other tests
❌ Hardcoded test data without cleanup
❌ No waits after API calls

## Troubleshooting

### Test Fails with "Redirected to /login"
**Cause**: Authentication not working
**Fix**: Check that backend is running on port 3000

### Test Fails with "Target page, context or browser has been closed"
**Cause**: Test timeout
**Fix**: Increase timeout or simplify test

### Test Fails with "Element not found"
**Cause**: UI changed or timing issue
**Fix**: Update selector or add wait

### Database Full of Test Data
**Cause**: Tests create data but don't clean up
**Fix**: Run `npm run cleanup:test-data` in backend

## CI/CD Integration

For GitHub Actions or similar:

```yaml
- name: Run E2E Tests
  run: |
    cd frontend
    npx playwright test standupbook-simple.spec.ts --reporter=html
```

## Coverage

Current test coverage for Standup Book module:

- ✅ Authentication flow
- ✅ Standup book page access
- ✅ Project/Sprint creation
- ✅ Day details page
- ⚠️ Lock day functionality (needs UI work)
- ⚠️ MOM creation (needs UI work)
- ❌ Snap management (not tested)
- ❌ Multi-slot handling (not tested)

## Future Improvements

1. Fix authentication persistence in comprehensive tests
2. Add visual regression testing
3. Add performance monitoring
4. Implement test data factories
5. Add API contract testing
6. Add accessibility testing
