# StandupSnap Demo Recording Guide

This guide explains how to use the demo recording scripts to create professional video recordings of your application flows.

## Quick Start

### 1. Prerequisites

Ensure you have:
- Frontend dev server running on `http://localhost:5173`
- Backend API server running on `http://localhost:3000`
- Playwright installed: `npm install`

### 2. Start Your Servers

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 3. Record the Demo

```bash
cd frontend

# Option 1: Headless recording (fastest)
npx playwright test demo-complete-user-journey.spec.ts --project=demo-recording

# Option 2: Headed mode (see the browser)
npx playwright test demo-complete-user-journey.spec.ts --project=demo-recording --headed

# Option 3: Debug mode (interactive)
npx playwright test demo-complete-user-journey.spec.ts --project=demo-recording --debug
```

### 4. Find Your Video

After running, your video will be saved to:
```
frontend/test-results/demo-complete-user-journey-[timestamp]/video.webm
```

You can convert `.webm` to `.mp4` using:
```bash
# Using ffmpeg
ffmpeg -i video.webm -c:v libx264 -preset slow -crf 22 output.mp4
```

---

## Available Demo Scripts

### 1. Complete User Journey (`demo-complete-user-journey.spec.ts`)

**Duration**: ~2-3 minutes
**What it shows**:
- User registration with role selection
- Project creation with timeline
- Sprint setup with goals and dates
- Multiple card creation with priorities
- Daily standup entry with AI parsing
- Dashboard and standup book views

**Best for**: Product demos, onboarding videos, investor presentations

---

## Configuration

### Video Settings

The `demo-recording` project in `playwright.config.ts` is optimized for video recording:

```typescript
{
  name: 'demo-recording',
  use: {
    viewport: { width: 1920, height: 1080 },  // Full HD
    video: {
      mode: 'on',                              // Always record
      size: { width: 1920, height: 1080 },    // Full HD video
    },
    actionTimeout: 10000,                      // Patient interactions
    navigationTimeout: 30000,                  // Patient page loads
  },
}
```

### Customizing Video Quality

Edit `playwright.config.ts` to adjust:

```typescript
video: {
  mode: 'on',
  size: { width: 1920, height: 1080 },  // Change resolution
  // For 4K: { width: 3840, height: 2160 }
  // For 720p: { width: 1280, height: 720 }
}
```

---

## Customizing Demo Scripts

### Adjusting Pacing

The demo uses the `demoPause()` helper function for pacing:

```typescript
const demoPause = async (page: any, duration: number = 1500) => {
  await page.waitForTimeout(duration);
};
```

**Quick adjustments**:
- **Faster demo**: Change default to `1000` (1 second)
- **Slower demo**: Change default to `2500` (2.5 seconds)
- **Specific pauses**: Use `await demoPause(page, 3000)` for important moments

### Changing Demo Data

Edit the constants at the top of the demo script:

```typescript
// Demo user credentials
const demoUser = {
  name: 'Your Name',
  email: `your.email.${uniqueId}@company.com`,
  username: `your_username_${uniqueId}`,
  password: 'YourPass123!',
  role: 'scrum_master'  // or 'product_owner', 'pmo'
};

// Demo project data
const demoProject = {
  name: `Your Project Name ${uniqueId}`,
  description: 'Your project description here',
  startDate: '2025-01-15',
  endDate: '2025-06-30',
};
```

### Adding More Steps

Add new sections to the demo script:

```typescript
// ==========================================
// STEP X: YOUR NEW STEP
// ==========================================
console.log('🎯 Starting your new step...');

await page.goto('/your-page');
await demoPause(page, 2000);

// Your interactions here
await page.getByRole('button', { name: /action/i }).click();
await demoPause(page, 1500);

console.log('✅ Your step completed!');
```

---

## Running Multiple Demos in Sequence

Create a script to record all demos:

```bash
# run-all-demos.sh
#!/bin/bash

echo "Recording all demos..."

npx playwright test demo-complete-user-journey.spec.ts --project=demo-recording
# npx playwright test demo-ai-standup.spec.ts --project=demo-recording
# npx playwright test demo-artifact-management.spec.ts --project=demo-recording

echo "All demos recorded! Check test-results/ folder"
```

---

## Video Post-Processing

### Convert to MP4

```bash
# Install ffmpeg first (https://ffmpeg.org/)

# Basic conversion
ffmpeg -i video.webm output.mp4

# High quality
ffmpeg -i video.webm -c:v libx264 -preset slow -crf 18 output.mp4

# Compress for web
ffmpeg -i video.webm -c:v libx264 -preset fast -crf 28 output.mp4
```

### Add Audio Narration

1. Record your narration separately
2. Combine with video:

```bash
ffmpeg -i video.mp4 -i narration.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output-with-audio.mp4
```

### Trim Video

```bash
# Trim first 5 seconds and last 3 seconds
ffmpeg -i video.mp4 -ss 5 -to -3 -c copy output-trimmed.mp4
```

### Add Watermark

```bash
ffmpeg -i video.mp4 -i logo.png -filter_complex "overlay=10:10" output-watermarked.mp4
```

---

## Troubleshooting

### Video Not Generated

1. **Check test passed**: Videos are only saved for completed tests
2. **Check video config**: Ensure `video: { mode: 'on' }` is set
3. **Check disk space**: Ensure you have enough space for video files

### Video Quality Issues

1. **Low resolution**: Increase `viewport` and `video.size` in config
2. **Choppy playback**: Increase `demoPause()` durations
3. **Too fast**: Add more `demoPause()` calls at key moments

### Tests Failing

1. **Selectors not found**: Check if UI has changed
2. **Timeouts**: Increase `actionTimeout` and `navigationTimeout`
3. **Server not running**: Ensure backend and frontend are running

### Backend/Frontend Not Starting

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

---

## Advanced: Creating Custom Demos

### Template for New Demo Script

```typescript
import { test, expect } from '@playwright/test';

test.describe('Your Demo Name', () => {
  const uniqueId = Date.now();

  // Helper function for pauses
  const demoPause = async (page: any, duration: number = 1500) => {
    await page.waitForTimeout(duration);
  };

  test('Your demo test name', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    console.log('🎬 Starting demo...');

    // Your demo steps here
    await page.goto('/your-page');
    await demoPause(page, 2000);

    // More interactions...

    console.log('✅ Demo complete!');
  });
});
```

### Running Specific Demo

```bash
# Run your custom demo
npx playwright test your-demo.spec.ts --project=demo-recording --headed
```

---

## Tips for Professional Videos

### 1. Consistent Pacing
- Use similar pause durations throughout
- Longer pauses (2-3s) for important moments
- Shorter pauses (0.8-1s) for routine actions

### 2. Realistic Data
- Use professional-looking names and emails
- Write meaningful descriptions and content
- Avoid "test123" or placeholder text

### 3. Clear Flow
- Follow logical user journeys
- Show cause and effect (action → result)
- End on a high note (dashboard, summary)

### 4. Strategic Highlights
- Pause longer on unique features (AI parsing)
- Show validation and success messages
- Display final results (reports, summaries)

### 5. Clean State
- Each demo creates unique data (uses `uniqueId`)
- No conflicts with existing test data
- Fresh database recommended for best results

---

## Example Recording Workflow

```bash
# 1. Clean database (optional, for pristine demo)
cd backend
npm run seed:reset

# 2. Start servers
npm run start:dev &
cd ../frontend
npm run dev &

# 3. Wait for servers to start
sleep 10

# 4. Record demo
npx playwright test demo-complete-user-journey.spec.ts --project=demo-recording

# 5. Find video
ls -lh test-results/demo-complete-user-journey-*/video.webm

# 6. Convert to MP4
ffmpeg -i test-results/demo-complete-user-journey-*/video.webm demo.mp4

# 7. Open video
open demo.mp4  # macOS
# start demo.mp4  # Windows
# xdg-open demo.mp4  # Linux
```

---

## FAQ

**Q: Can I pause the recording during execution?**
A: No, but you can add longer `demoPause()` calls at specific points.

**Q: How do I change the browser?**
A: Edit `playwright.config.ts` and change `Desktop Chrome` to `Desktop Firefox` or `Desktop Safari`.

**Q: Can I record in different resolutions?**
A: Yes, edit the `viewport` and `video.size` settings in the `demo-recording` project config.

**Q: How do I add mouse highlights?**
A: Playwright doesn't have built-in mouse highlighting. Use post-processing tools like Camtasia or ScreenFlow.

**Q: Can I record specific sections only?**
A: Yes, comment out sections in the demo script you don't want to record.

**Q: How do I make the demo slower?**
A: Increase all `demoPause()` durations. Global find/replace `demoPause(page, 1500)` → `demoPause(page, 3000)`.

---

## Next Steps

1. ✅ Record your first demo
2. ✅ Review the video and adjust pacing
3. ✅ Customize demo data for your needs
4. ✅ Create additional demos for other flows
5. ✅ Add narration and post-processing
6. ✅ Share with your team!

---

## Support

For issues or questions:
- Check Playwright docs: https://playwright.dev/
- Review test output for errors
- Adjust timeouts if tests are timing out
- Verify servers are running on correct ports

Happy recording! 🎬
