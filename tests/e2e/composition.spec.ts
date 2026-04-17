import { expect, test } from '@playwright/test';

/**
 * Smoke E2E proving the html_composition flow works end-to-end in prod.
 * Runs in CI only — reads ADMIN_PASSWORD from env (injected from
 * SCHOOL_FACTORY_ADMIN_PASSWORD secret). No credentials ever touch git.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'https://whitelabel.12brain.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

test.describe('html_composition admin flow', () => {
  test.skip(!ADMIN_PASSWORD, 'ADMIN_PASSWORD not provided — skipping');

  test('admin sees HTML Composition option and can validate sample JSON', async ({ page }) => {
    // 1. Navigate to admin login
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Minha Escola|Escola|IA/i);

    // 2. Login
    const passwordInput = page.getByPlaceholder(/senha/i).first();
    await passwordInput.fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();

    // 3. Wait for admin dashboard to load (lessons list or add button)
    const addButton = page.getByRole('button', { name: /adicionar.*aula|nova aula|adicionar/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 15000 });
    await page.screenshot({ path: 'artifacts/01-admin-dashboard.png', fullPage: true });

    // 4. Open the "Add lesson" dialog
    await addButton.click();

    // 5. Wait for the dialog content and the 4 type buttons
    await expect(
      page.getByRole('button', { name: /^youtube$/i }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole('button', { name: /html composition/i }),
    ).toBeVisible();
    await page.screenshot({ path: 'artifacts/02-add-dialog-four-buttons.png', fullPage: true });

    // 6. Select html_composition
    await page.getByRole('button', { name: /html composition/i }).click();

    // 7. Load sample JSON
    await expect(
      page.getByRole('button', { name: /load sample/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /load sample/i }).click();

    // 8. Verify the validator marks it valid
    await expect(page.getByText(/valid composition/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'artifacts/03-sample-loaded-valid.png', fullPage: true });

    // 9. Open preview → ensures CompositionPlayer mounts in prod bundle
    await page.getByRole('button', { name: /^preview$/i }).click();
    // Wait a moment for the player's first scene to render
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'artifacts/04-preview-rendered.png', fullPage: true });

    // 10. Assert the first scene text from the sample composition is visible
    await expect(page.getByText(/welcome to the lesson/i)).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'artifacts/05-first-scene-visible.png', fullPage: true });
  });
});
