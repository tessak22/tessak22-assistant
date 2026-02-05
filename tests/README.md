# E2E Testing with Playwright

Comprehensive end-to-end tests for the Ivy Lee Task Tracker to ensure all features work correctly and data is properly isolated between users.

## Test Coverage

### 1. Authentication (`01-auth.spec.ts`)
- Redirect unauthenticated users to sign-in
- Display sign-in form
- Validate email input
- Allow authenticated users to access app
- Show user in navigation
- Sign out functionality
- Protect API routes

### 2. Client Management (`02-clients.spec.ts`)
- Navigate to clients page
- Create new clients
- Edit existing clients
- Delete clients
- Display client priorities correctly
- Show empty state

### 3. Task Management (`03-tasks.spec.ts`)
- Navigate to tasks page
- Create tasks via full form
- Create tasks via quick add
- Edit existing tasks
- Change task status (pending → in_progress → completed)
- Delete tasks
- Filter tasks by status
- Enforce 60-minute limit (Ivy Lee method)

### 4. Daily Plan & Ivy Lee Method (`04-daily-plan.spec.ts`)
- Show empty state with no tasks
- Navigate to morning check-in
- Generate daily plan with top 6 tasks
- Complete morning check-in
- Complete tasks from home page
- Regenerate plan with new tasks
- Complete evening check-in
- Show progress bar

### 5. Multi-User Data Isolation (`05-multi-user.spec.ts`) **CRITICAL**
- Isolate clients between users
- Isolate tasks between users
- Isolate daily plans between users
- Prevent API access to other users' data
- Prevent editing other users' tasks
- Prevent deleting other users' clients

## Running Tests

### Prerequisites

1. **PostgreSQL database running locally:**
   ```bash
   brew services start postgresql@15
   ```

2. **Environment variables set in `.env.local`:**
   ```
   DATABASE_URL=postgresql://localhost:5432/ivylee_dev
   NEXTAUTH_URL=http://localhost:3001
   NEXTAUTH_SECRET=<your-secret>
   RESEND_API_KEY=<your-key>
   EMAIL_FROM=onboarding@resend.dev
   ```

### Run All Tests

```bash
npm test
```

### Run Tests in UI Mode (Recommended for Development)

```bash
npm run test:ui
```

This opens an interactive UI where you can:
- See all tests
- Run tests individually
- Watch tests run in real-time
- Debug failed tests

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:headed
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/01-auth.spec.ts
```

### Run Tests Matching a Pattern

```bash
npx playwright test --grep "authentication"
```

### View Test Report

After running tests, view the HTML report:

```bash
npm run test:report
```

## Test Database

Tests use the same database as development (`ivylee_dev`). The test helpers automatically:

- Create test users
- Clean up test data before each test
- Clean up test data after each test

**Important:** Tests create users with emails like `test-*@example.com`. These are automatically cleaned up after each test run.

## Continuous Integration

For CI environments, tests run in headless mode automatically:

```bash
# In CI
export CI=true
npm test
```

## Debugging Failed Tests

### 1. Screenshots
Failed tests automatically capture screenshots in `test-results/`

### 2. Videos
Failed tests record videos in `test-results/`

### 3. Traces
View detailed traces of failed tests:
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

### 4. Debug Mode
Run a specific test in debug mode:
```bash
npx playwright test tests/e2e/01-auth.spec.ts --debug
```

## Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { signInAsTestUser, cleanupUserData } from './helpers';

test.describe('Feature Name', () => {
  const TEST_USER = 'test-feature@example.com';

  test.beforeEach(async ({ page }) => {
    await cleanupUserData(TEST_USER);
    await signInAsTestUser(page, TEST_USER);
  });

  test.afterEach(async () => {
    await cleanupUserData(TEST_USER);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/some-page');
    // Test logic here
    await expect(page.locator('h1')).toContainText('Expected Text');
  });
});
```

### Helper Functions

- `signInAsTestUser(page, email)` - Create and sign in as a test user
- `cleanupUserData(email)` - Remove all data for a test user
- `createTestUser(email)` - Create a user in the database
- `waitForApiCall(page, urlPattern)` - Wait for specific API calls

## Best Practices

1. **Always clean up test data** - Use beforeEach/afterEach hooks
2. **Use unique test user emails** - Prevents conflicts between test files
3. **Wait for API calls** - Use `waitForApiCall()` for async operations
4. **Test user isolation** - Critical for multi-user apps
5. **Use descriptive test names** - Should read like requirements
6. **Test one thing per test** - Easier to debug when they fail

## QA Automation

These tests are designed for automated QA:

1. **Pre-deployment:** Run full test suite
2. **Regression testing:** Run after any code changes
3. **CI/CD integration:** Automated on every pull request
4. **Cross-browser:** Easy to add Firefox/Safari/Edge

### Adding to CI/CD

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run tests
  run: npm test

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests hang or timeout
- Check if dev server is running (`npm run dev`)
- Increase timeout in `playwright.config.ts`

### Database connection errors
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env.local`
- Ensure database `ivylee_dev` exists

### Authentication tests fail
- Check NextAuth configuration
- Verify session creation in database
- Check cookie settings

### Tests pass locally but fail in CI
- Set `CI=true` environment variable
- Check database is available in CI
- Verify all environment variables are set

## Coverage Goals

- ✅ Authentication: 100%
- ✅ Client Management: 100%
- ✅ Task Management: 100%
- ✅ Daily Planning: 100%
- ✅ Multi-User Isolation: 100%

## Future Tests

Potential additions:
- [ ] Performance tests (load time, API response)
- [ ] Accessibility tests (WCAG compliance)
- [ ] Mobile responsive tests
- [ ] Email delivery tests (magic link)
- [ ] API integration tests (separate from E2E)
