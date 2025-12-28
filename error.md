1) [chromium] › e2e\standupbook-progressive.spec.ts:219:5 › Standup Book - Progressive Sprint Workflow › DAY 1 - Sprint Kickoff (Today) › should show Day 1 as today and future days as disabled 

    Error: expect(locator).toBeEnabled() failed

    Locator: locator('button').filter({ hasText: /^1$/ }).first()
    Expected: enabled
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeEnabled" with timeout 5000ms
      - waiting for locator('button').filter({ hasText: /^1$/ }).first()


      230 |       // Day 1 should be accessible (it's today)
      231 |       const day1Book = page.locator('button').filter({ hasText: /^1$/ }).first();
    > 232 |       await expect(day1Book).toBeEnabled();
          |                              ^
      233 |
      234 |       // Days 2-7 should be disabled (they're in the future)
      235 |       const day2Book = page.locator('button').filter({ hasText: /^2$/ }).first();
        at F:\StandupSnap\frontend\e2e\standupbook-progressive.spec.ts:232:30

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\standupbook-progressive-St-667ac-and-future-days-as-disabled-chromium\test-finished-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\standupbook-progressive-St-667ac-and-future-days-as-disabled-chromium\test-failed-2.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results\standupbook-progressive-St-667ac-and-future-days-as-disabled-chromium\error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results\standupbook-progressive-St-667ac-and-future-days-as-disabled-chromium\trace.zip
    Usage:

        npx playwright show-trace test-results\standupbook-progressive-St-667ac-and-future-days-as-disabled-chromium\trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  1 failed
    [chromium] › e2e\standupbook-progressive.spec.ts:219:5 › Standup Book - Progressive Sprint Workflow › DAY 1 - Sprint Kickoff (Today) › should show Day 1 as today and future days as disabled
  11 did not run
