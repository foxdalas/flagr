import { test, expect } from '@playwright/test';
const { createFlag, createTag, attachTag } = require('./helpers');

// Locate a tag row in the main table body (avoids the fixed-column clone).
function tagRow(page, name) {
  return page
    .locator('.tags-table .el-table__body tr')
    .filter({ hasText: name })
    .first();
}

async function gotoTags(page) {
  await page.goto('/#/tags');
  await page.waitForSelector('[data-testid="create-tag-button"]', {
    timeout: 10000,
  });
}

async function createTagViaDialog(page, name, description) {
  await page.locator('[data-testid="create-tag-button"]').click();
  await page.waitForSelector('.el-dialog', { timeout: 5000 });
  await page.locator('[data-testid="new-tag-name"]').fill(name);
  if (description) {
    await page.locator('[data-testid="new-tag-description"]').fill(description);
  }
  await page.locator('[data-testid="confirm-create-tag"]').click();
}

test.describe('Tags Page - Navigation and layout', () => {
  test('Navbar Tags link is visible and ordered before API link', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('.flags-container');

    const tagsLink = page
      .locator('.nav-links a')
      .filter({ hasText: 'Tags' });
    await expect(tagsLink).toBeVisible();
    await expect(tagsLink).toHaveAttribute('href', /\/tags$/);

    // Tags should appear before API in the navbar
    const labels = await page.locator('.nav-links a').allInnerTexts();
    const tagsIdx = labels.findIndex((t) => t.trim() === 'Tags');
    const apiIdx = labels.findIndex((t) => t.trim() === 'API');
    expect(tagsIdx).toBeGreaterThanOrEqual(0);
    expect(apiIdx).toBeGreaterThanOrEqual(0);
    expect(tagsIdx).toBeLessThan(apiIdx);
  });

  test('Clicking Tags link navigates to /#/tags and renders the table', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('.flags-container');
    await page.locator('.nav-links a').filter({ hasText: 'Tags' }).click();
    await expect(page).toHaveURL(/\/#\/tags$/);
    await expect(
      page.locator('[data-testid="create-tag-button"]'),
    ).toBeVisible();
  });

  test('Table shows expected column headers', async ({ page }) => {
    // Make sure there is at least one tag so the table is rendered
    await createTag('header-tag-' + Date.now(), 'header check');
    await gotoTags(page);
    const header = page.locator('.tags-table .el-table__header').first();
    await expect(header).toContainText('ID');
    await expect(header).toContainText('Name');
    await expect(header).toContainText('Created At');
    await expect(header).toContainText('Description');
    await expect(header).toContainText('Actions');
  });

  test('Routing regression: Home -> Tags -> Home -> Tags stays rendered', async ({
    page,
  }) => {
    await page.goto('/#/');
    await page.waitForSelector('.flags-container');

    // Home -> Tags
    await page.locator('.nav-links a').filter({ hasText: 'Tags' }).click();
    await expect(
      page.locator('[data-testid="create-tag-button"]'),
    ).toBeVisible();

    // Tags -> Home via logo
    await page.locator('.logo').click();
    await expect(page).toHaveURL(/\/#\/$/);
    await page.waitForSelector('.flags-container');
    await expect(page.locator('.flags-container')).toBeVisible();

    // Home -> Tags again (previously rendered a blank page)
    await page.locator('.nav-links a').filter({ hasText: 'Tags' }).click();
    await expect(page).toHaveURL(/\/#\/tags$/);
    await expect(
      page.locator('[data-testid="create-tag-button"]'),
    ).toBeVisible();
  });
});

test.describe('Tags Page - Create', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTags(page);
  });

  test('Create a tag with name and description', async ({ page }) => {
    const name = 'create-tag-' + Date.now();
    await createTagViaDialog(page, name, 'my description');
    await expect(page.locator('.el-message').last()).toContainText(
      'Tag created',
    );
    const row = tagRow(page, name);
    await expect(row).toBeVisible();
    await expect(row).toContainText('my description');
  });

  test('Create a tag without description shows placeholder', async ({
    page,
  }) => {
    const name = 'nodesc-tag-' + Date.now();
    await createTagViaDialog(page, name, '');
    await expect(page.locator('.el-message').last()).toContainText(
      'Tag created',
    );
    const row = tagRow(page, name);
    await expect(row.locator('.description-text')).toHaveText('—');
  });

  test('Create tags with allowed special characters', async ({ page }) => {
    const ts = Date.now();
    const validNames = [
      `v1.0-${ts}`,
      `env:prod-${ts}`,
      `feature/login-${ts}`,
      `my-tag-${ts}`,
    ];
    for (const name of validNames) {
      await createTagViaDialog(page, name, '');
      await expect(page.locator('.el-message').last()).toContainText(
        'Tag created',
      );
      await expect(tagRow(page, name)).toBeVisible();
    }
  });

  test('Invalid characters block creation with a validation error', async ({
    page,
  }) => {
    const name = 'tag@invalid-' + Date.now();
    await page.locator('[data-testid="create-tag-button"]').click();
    await page.waitForSelector('.el-dialog');
    await page.locator('[data-testid="new-tag-name"]').fill(name);
    // Inline validation error appears for invalid characters
    await expect(page.locator('.el-form-item__error')).toBeVisible();
    await page.locator('[data-testid="confirm-create-tag"]').click();
    // Dialog stays open and an error toast is shown
    await expect(page.locator('.el-message--error').last()).toBeVisible();
    await expect(page.locator('.el-dialog')).toBeVisible();
    // Close and confirm no row was created
    await page
      .locator('.el-dialog')
      .locator('button')
      .filter({ hasText: 'Cancel' })
      .click();
    await page.waitForTimeout(300);
    await expect(
      page
        .locator('.tags-table .el-table__body tr')
        .filter({ hasText: name }),
    ).toHaveCount(0);
  });

  test('Name longer than 63 characters is rejected', async ({ page }) => {
    const longName = 'a'.repeat(64);
    await page.locator('[data-testid="create-tag-button"]').click();
    await page.waitForSelector('.el-dialog');
    await page.locator('[data-testid="new-tag-name"]').fill(longName);
    await expect(page.locator('.el-form-item__error')).toContainText(
      'at most 63 characters',
    );
    await page.locator('[data-testid="confirm-create-tag"]').click();
    await expect(page.locator('.el-message--error').last()).toBeVisible();
    await expect(page.locator('.el-dialog')).toBeVisible();
  });

  test('Duplicate tag value is rejected by the backend', async ({ page }) => {
    const name = 'dup-tag-' + Date.now();
    await createTag(name, 'first');
    await gotoTags(page);
    await createTagViaDialog(page, name, 'second');
    await expect(page.locator('.el-message--error').last()).toBeVisible();
    // Close the dialog and hard-reload to assert no duplicate row was persisted
    await page
      .locator('.el-dialog')
      .locator('button')
      .filter({ hasText: 'Cancel' })
      .click();
    await page.reload();
    await page.waitForSelector('[data-testid="create-tag-button"]');
    await expect(
      page
        .locator('.tags-table .el-table__body tr')
        .filter({ hasText: name }),
    ).toHaveCount(1);
  });
});

test.describe('Tags Page - Edit description', () => {
  test('Edit and save a description', async ({ page }) => {
    const name = 'edit-tag-' + Date.now();
    await createTag(name, 'original');
    await gotoTags(page);

    const row = tagRow(page, name);
    await row.locator('[data-testid="edit-description-button"]').click();
    const input = row.locator('.description-input textarea');
    await expect(input).toBeVisible();
    await input.fill('updated description');
    await row.locator('[data-testid="save-description-button"]').click();

    await expect(page.locator('.el-message').last()).toContainText(
      'Tag updated',
    );
    await expect(tagRow(page, name)).toContainText('updated description');
  });

  test('Cancel edit keeps the original description', async ({ page }) => {
    const name = 'cancel-edit-tag-' + Date.now();
    await createTag(name, 'keep-me');
    await gotoTags(page);

    const row = tagRow(page, name);
    await row.locator('[data-testid="edit-description-button"]').click();
    const input = row.locator('.description-input textarea');
    await input.fill('this should be discarded');
    await row
      .locator('.description-actions button')
      .filter({ hasText: 'Cancel' })
      .click();

    await expect(tagRow(page, name).locator('.description-text')).toHaveText(
      'keep-me',
    );
  });

  test('Editing a row only edits description, name stays static', async ({
    page,
  }) => {
    const name = 'immutable-name-' + Date.now();
    await createTag(name, 'desc');
    await gotoTags(page);

    const row = tagRow(page, name);
    await row.locator('[data-testid="edit-description-button"]').click();
    // The only editable input in the row is the description textarea
    await expect(row.locator('.description-input textarea')).toBeVisible();
    await expect(row.locator('input')).toHaveCount(0);
    // The name chip is still rendered as a tag
    await expect(row.locator('.el-tag')).toContainText(name);
  });

  test('Description textarea enforces the 512 character cap', async ({
    page,
  }) => {
    const name = 'maxlen-tag-' + Date.now();
    await createTag(name, 'desc');
    await gotoTags(page);

    const row = tagRow(page, name);
    await row.locator('[data-testid="edit-description-button"]').click();
    const input = row.locator('.description-input textarea');
    await expect(input).toHaveAttribute('maxlength', '512');
    await input.fill('x'.repeat(600));
    const value = await input.inputValue();
    expect(value.length).toBe(512);
  });
});

test.describe('Tags Page - Delete', () => {
  test('Delete an unused tag', async ({ page }) => {
    const name = 'delete-tag-' + Date.now();
    await createTag(name, 'to be deleted');
    await gotoTags(page);

    const row = tagRow(page, name);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="delete-tag-button"]').click();

    const confirmBtn = page
      .locator('.el-message-box')
      .locator('button')
      .filter({ hasText: 'Delete' });
    await expect(confirmBtn).toBeVisible({ timeout: 3000 });
    await confirmBtn.click();

    await expect(page.locator('.el-message').last()).toContainText(
      'Tag deleted',
    );
    await expect(
      page
        .locator('.tags-table .el-table__body tr')
        .filter({ hasText: name }),
    ).toHaveCount(0);
  });

  test('Deleting an in-use tag is blocked with an error', async ({ page }) => {
    const name = 'inuse-tag-' + Date.now();
    await createTag(name, 'used by a flag');
    const flag = await createFlag('tag-inuse-flag-' + Date.now());
    await attachTag(flag.id, name);

    await gotoTags(page);
    const row = tagRow(page, name);
    await expect(row).toBeVisible();
    await row.locator('[data-testid="delete-tag-button"]').click();

    const confirmBtn = page
      .locator('.el-message-box')
      .locator('button')
      .filter({ hasText: 'Delete' });
    await expect(confirmBtn).toBeVisible({ timeout: 3000 });
    await confirmBtn.click();

    await expect(page.locator('.el-message--error').last()).toContainText(
      'used by one or more flags',
    );
    // Row remains
    await expect(tagRow(page, name)).toBeVisible();
  });
});

test.describe('Tags Page - Description tooltip', () => {
  test('Hovering a tag chip on the flag page shows its description', async ({
    page,
  }) => {
    const ts = Date.now();
    const name = 'tooltip-tag-' + ts;
    const description = 'tooltip description ' + ts;
    await createTag(name, description);
    const flag = await createFlag('tooltip-flag-' + ts);
    await attachTag(flag.id, name);

    await page.goto(`/#/flags/${flag.id}`);
    await page.waitForSelector('.flag-config-card', { timeout: 10000 });

    const chip = page
      .locator('.tags-container-inner .el-tag')
      .filter({ hasText: name });
    await expect(chip).toBeVisible();
    await chip.hover();

    await expect(
      page.locator('.el-popper').filter({ hasText: description }),
    ).toBeVisible({ timeout: 5000 });
  });
});
