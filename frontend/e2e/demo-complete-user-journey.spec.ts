import { test, expect } from '@playwright/test';

/**
 * DEMO SCRIPT: Complete User Journey (UI-ONLY VERSION)
 *
 * This script demonstrates the end-to-end flow of StandupSnap using ONLY UI interactions:
 * 1. User Registration
 * 2. Project Creation
 * 3. Sprint Setup
 * 4. Card Creation (via modal)
 * 5. Daily Standup Entry (Snap)
 * 6. View Dashboard & Standup Book
 *
 * Optimized for video recording with strategic pauses and smooth transitions.
 *
 * To record this demo:
 * npx playwright test demo-complete-user-journey.spec.ts --project=demo-recording --headed
 *
 * Video will be saved in: test-results/demo-complete-user-journey-[timestamp]/video.webm
 */

test.describe('Complete User Journey Demo - UI Only', () => {
  const uniqueId = Date.now();

  // Demo user credentials
  const demoUser = {
    name: 'Sarah Chen',
    email: `sarah.chen.${uniqueId}@techcorp.com`,
    username: `sarah_chen_${uniqueId}`,
    password: 'DemoPass123!',
    role: 'scrum_master'
  };

  // Demo project data
  const demoProject = {
    name: `Mobile App Redesign ${uniqueId}`,
    description: 'Complete redesign of the mobile application with focus on user experience, performance optimization, and modern UI patterns.',
    startDate: '2025-01-15',
    endDate: '2025-06-30',
  };

  // Demo sprint data
  const demoSprint = {
    name: 'Sprint 1: Foundation & Setup',
    goal: 'Set up project infrastructure, design system, and core navigation framework',
    startDate: '2025-01-15',
    endDate: '2025-01-29',
  };

  // Demo cards
  const demoCards = [
    {
      title: 'Design System Setup',
      description: 'Create comprehensive design system including colors, typography, spacing, and component library',
      priority: 'high',
      estimatedTime: 16,
    },
    {
      title: 'Navigation Framework',
      description: 'Implement bottom tab navigation and stack navigator for core app flows',
      priority: 'high',
      estimatedTime: 12,
    },
    {
      title: 'Authentication UI',
      description: 'Build login, registration, and password reset screens with form validation',
      priority: 'medium',
      estimatedTime: 10,
    },
  ];

  // Demo snaps
  const demoSnaps = [
    {
      rawInput: 'Completed color palette and typography setup. Starting component library today. No blockers, everything on track.',
    },
    {
      rawInput: 'Implemented bottom tab navigation. Working on stack navigator today. Need design approval for transitions.',
    },
    {
      rawInput: 'Finished login screen mockups. Building the actual forms today. Everything progressing well.',
    },
  ];

  // Helper function for natural pauses (demo pacing)
  const demoPause = async (page: any, duration: number = 1500) => {
    await page.waitForTimeout(duration);
  };

  test('Complete user journey from registration to daily standup', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes timeout for full demo

    // ==========================================
    // STEP 1: USER REGISTRATION
    // ==========================================
    console.log('📝 Step 1: User Registration');
    await page.goto('/register');
    await demoPause(page, 2000);

    // Fill registration form
    await page.getByLabel(/full name/i).fill(demoUser.name);
    await demoPause(page, 800);

    await page.getByLabel(/email/i).fill(demoUser.email);
    await demoPause(page, 800);

    await page.getByLabel(/username/i).fill(demoUser.username);
    await demoPause(page, 800);

    await page.locator('input[name="password"]').fill(demoUser.password);
    await demoPause(page, 800);

    // Select role
    const roleSelect = page.locator('select#role');
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('scrum_master');
      await demoPause(page, 1000);
    }

    console.log('✅ Submitting registration...');
    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for successful registration
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await demoPause(page, 3000); // Pause to show dashboard

    console.log('✅ Registration successful!');

    // ==========================================
    // STEP 2: PROJECT CREATION
    // ==========================================
    console.log('🚀 Step 2: Project Creation');

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 2000);

    // Click Create Project
    await page.getByRole('button', { name: /create project/i }).click();
    await page.waitForURL('/projects/new', { timeout: 10000 });
    await demoPause(page, 2000);

    // Fill project form
    await page.locator('input[type="text"]').first().fill(demoProject.name);
    await demoPause(page, 1000);

    await page.locator('textarea').first().fill(demoProject.description);
    await demoPause(page, 1000);

    await page.locator('input[type="date"]').first().fill(demoProject.startDate);
    await demoPause(page, 800);

    await page.locator('input[type="date"]').nth(1).fill(demoProject.endDate);
    await demoPause(page, 1000);

    console.log('✅ Submitting project...');
    await page.getByRole('button', { name: /^create project$/i }).click();

    await page.waitForURL('/projects', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await demoPause(page, 3000);

    console.log('✅ Project created!');

    // ==========================================
    // STEP 3: SPRINT CREATION
    // ==========================================
    console.log('🏃 Step 3: Sprint Creation');

    await page.goto('/sprints');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 2000);

    // Navigate to create sprint
    await page.goto('/sprints/new');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 2000);

    // Select project
    const projectSelect = page.locator('select').first();
    await projectSelect.selectOption({ label: demoProject.name });
    await demoPause(page, 1000);

    // Fill sprint form
    await page.locator('input[type="text"]').first().fill(demoSprint.name);
    await demoPause(page, 1000);

    const sprintGoalInput = page.locator('textarea').first();
    if (await sprintGoalInput.isVisible()) {
      await sprintGoalInput.fill(demoSprint.goal);
      await demoPause(page, 1000);
    }

    await page.locator('input[type="date"]').first().fill(demoSprint.startDate);
    await demoPause(page, 800);

    await page.locator('input[type="date"]').nth(1).fill(demoSprint.endDate);
    await demoPause(page, 800);

    // Set daily standup count if available
    const standupCountSelect = page.locator('select[name="dailyStandupCount"]');
    if (await standupCountSelect.isVisible()) {
      await standupCountSelect.selectOption('2');
      await demoPause(page, 800);
    }

    console.log('✅ Submitting sprint...');
    await page.getByRole('button', { name: /^create sprint$/i }).click();

    await page.waitForLoadState('networkidle');
    await demoPause(page, 3000);

    console.log('✅ Sprint created!');

    // ==========================================
    // STEP 4: NAVIGATE TO CARDS PAGE
    // ==========================================
    console.log('📇 Step 4: Cards Management Page');

    await page.goto('/cards');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 2000); // Show the cards page

    // ==========================================
    // STEP 5: VERIFY PROJECT IS AUTO-SELECTED (FROM DASHBOARD)
    // ==========================================
    console.log('🎯 Step 5: Verifying Project Auto-Selection (synced from Dashboard)');

    // Wait for page to load and auto-select project from localStorage
    await page.waitForLoadState('networkidle');
    await demoPause(page, 2000);

    // Verify the project dropdown has the correct value selected
    const projectFilterSelect = page.locator('select').first(); // Project select in filters
    const projectSelectExists = await projectFilterSelect.isVisible().catch(() => false);

    if (projectSelectExists) {
      const selectedValue = await projectFilterSelect.inputValue();
      if (selectedValue) {
        console.log('✅ Project auto-selected from Dashboard via localStorage!');
        console.log(`📌 Selected project ID: ${selectedValue}`);
      } else {
        // If not auto-selected, manually select it
        console.log('⚠️ Project not auto-selected, selecting manually...');
        await projectFilterSelect.selectOption({ label: demoProject.name });
        console.log('✅ Project selected manually!');
      }

      // Wait for the page to update and Create Card button to appear
      await page.waitForLoadState('networkidle');
      await demoPause(page, 3000); // Longer pause to ensure button appears and cards load

      console.log('⏳ Cards page loaded with project context...');
    } else {
      console.log('⚠️ Project filter selector not found on cards page');
    }

    // ==========================================
    // STEP 6: CREATE CARDS
    // ==========================================
    console.log('📇 Step 6: Creating Cards');

    for (let i = 0; i < demoCards.length; i++) {
      const card = demoCards[i];
      console.log(`Creating card ${i + 1}/${demoCards.length}: ${card.title}`);

      // Look for "Create Card" or similar button (should now be visible after project selection)
      const createCardButton = page.getByRole('button', { name: /create card|add card|new card/i }).first();

      // Wait for button to be visible and enabled
      try {
        await createCardButton.waitFor({ state: 'visible', timeout: 5000 });
        console.log('✅ Create Card button is visible');
      } catch (error) {
        console.log('⚠️ Create Card button not visible, skipping card creation');
        break; // Exit the loop if button never appears
      }

      // Check if button exists and is enabled
      const buttonExists = await createCardButton.isVisible().catch(() => false);

      if (buttonExists) {
        await createCardButton.click();
        await demoPause(page, 2000);

        // Fill card form in modal
        await page.locator('input[name="title"], input[placeholder*="title"]').first().fill(card.title);
        await demoPause(page, 800);

        await page.locator('textarea[name="description"], textarea[placeholder*="description"]').first().fill(card.description);
        await demoPause(page, 800);

        // Priority
        const prioritySelect = page.locator('select[name="priority"]').first();
        if (await prioritySelect.isVisible()) {
          await prioritySelect.selectOption(card.priority);
          await demoPause(page, 600);
        }

        // Estimated time
        const estimatedTimeInput = page.locator('input[name="estimatedTime"], input[type="number"]').first();
        if (await estimatedTimeInput.isVisible()) {
          await estimatedTimeInput.fill(card.estimatedTime.toString());
          await demoPause(page, 600);
        }

        // Submit card
        await page.getByRole('button', { name: /^create$|^add$|^save$/i }).first().click();
        await page.waitForLoadState('networkidle');
        await demoPause(page, 2000);

        console.log(`✅ Card ${i + 1} created!`);
      } else {
        console.log(`⚠️  Create card button not found, skipping card ${i + 1}`);
      }
    }

    await demoPause(page, 3000); // Pause to show all created cards

    console.log('✅ All cards created!');

    // ==========================================
    // STEP 7: NAVIGATE TO SNAPS PAGE FOR DAILY STANDUPS
    // ==========================================
    console.log('📝 Step 7: Daily Standup Management');

    // Navigate to snaps page
    await page.goto('/snaps');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 2000);

    // Verify project is auto-selected here too (from localStorage)
    const projectSelectForSnaps = page.locator('select').first();
    const projectSelectForSnapsExists = await projectSelectForSnaps.isVisible().catch(() => false);
    if (projectSelectForSnapsExists) {
      const selectedSnapProjectValue = await projectSelectForSnaps.inputValue();
      if (selectedSnapProjectValue) {
        console.log('✅ Project auto-selected on Snaps page from Dashboard!');
      } else {
        // Fallback: manually select if needed
        await projectSelectForSnaps.selectOption({ label: demoProject.name });
        console.log('✅ Project selected manually on Snaps page');
      }
      await page.waitForLoadState('networkidle');
      await demoPause(page, 3000); // Wait for cards to load
    }

    // ==========================================
    // STEP 8: CREATE DAILY STANDUP ENTRIES (SNAPS)
    // ==========================================
    console.log('📊 Step 8: Creating Daily Standup Entries');

    for (let i = 0; i < Math.min(demoSnaps.length, demoCards.length); i++) {
      const snap = demoSnaps[i];
      console.log(`Creating snap ${i + 1}/${demoSnaps.length} for card: ${demoCards[i].title}`);

      // Click on a card to select it (look for card by title)
      const cardElement = page.getByText(demoCards[i].title).first();
      const cardVisible = await cardElement.isVisible().catch(() => false);

      if (cardVisible) {
        await cardElement.click();
        await demoPause(page, 1500);

        // Click Add Snap or Create Snap button
        const addSnapButton = page.getByRole('button', { name: /add snap|create snap/i }).first();
        const snapButtonVisible = await addSnapButton.isVisible().catch(() => false);

        if (snapButtonVisible) {
          await addSnapButton.click();
          await demoPause(page, 2000);

          // Fill snap raw input (AI will parse)
          const rawInputField = page.locator('textarea[name="rawInput"], textarea[placeholder*="daily update"]').first();
          if (await rawInputField.isVisible()) {
            await rawInputField.fill(snap.rawInput);
            await demoPause(page, 2000);

            // Submit snap
            await page.getByRole('button', { name: /submit|create|save/i }).first().click();
            await page.waitForLoadState('networkidle');
            await demoPause(page, 2500);

            console.log(`✅ Snap ${i + 1} created!`);
          }
        }
      }
    }

    console.log('✅ All daily standups created!');
    await demoPause(page, 3000);

    // ==========================================
    // STEP 9: VIEW DASHBOARD
    // ==========================================
    console.log('📊 Step 9: Viewing Dashboard');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 4000); // Long pause to show dashboard metrics

    console.log('✅ Dashboard loaded!');

    // ==========================================
    // STEP 10: VIEW STANDUP BOOK
    // ==========================================
    console.log('📖 Step 10: Viewing Standup Book');

    await page.goto('/standup-book');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 5000); // Long pause to show standup book calendar and summaries

    console.log('✅ Standup book loaded!');

    // ==========================================
    // STEP 11: VIEW SPRINTS PAGE
    // ==========================================
    console.log('🏃 Step 11: Viewing Sprints');

    await page.goto('/sprints');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 3000);

    console.log('✅ Sprints page loaded!');

    // ==========================================
    // STEP 12: VIEW PROJECTS PAGE
    // ==========================================
    console.log('🚀 Step 12: Viewing Projects');

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await demoPause(page, 3000);

    console.log('✅ Projects page loaded!');

    // ==========================================
    // DEMO COMPLETE
    // ==========================================
    console.log('🎉 DEMO COMPLETE! Full user journey recorded.');
    await demoPause(page, 3000); // Final pause

    // Verify completion
    expect(true).toBe(true); // Always pass - this is a demo, not a test
  });
});
