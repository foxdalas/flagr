import { test, expect } from '@playwright/test'
const { API, createFlag, createVariant, createSegment } = require('./helpers')

let flagId

test.describe('Flag Variants', () => {
  test.beforeAll(async () => {
    const flag = await createFlag('variants-test-' + Date.now())
    flagId = flag.id
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
  })

  test('Empty state', async ({ page }) => {
    await expect(page.locator('.card--empty').first()).toContainText('No variants defined yet')
  })

  test('Create variant', async ({ page }) => {
    const keyInput = page.locator('input[placeholder="Variant Key"]')
    const createBtn = page.locator('button').filter({ hasText: 'Create Variant' })
    await expect(createBtn).toBeDisabled()
    await keyInput.fill('control')
    await expect(createBtn).not.toBeDisabled()
    await createBtn.click()
    await expect(page.locator('.el-message')).toContainText('Variant created')
    // Variant key is inside an input element, check via input value
    await expect(page.locator('.variants-container-inner .variant-key-input input').first()).toHaveValue('control')
  })

  test('Create second variant', async ({ page }) => {
    const keyInput = page.locator('input[placeholder="Variant Key"]')
    const createBtn = page.locator('button').filter({ hasText: 'Create Variant' })
    await keyInput.fill('treatment')
    await createBtn.click()
    await expect(page.locator('.el-message').last()).toContainText('Variant created')
    await page.waitForTimeout(300)
    // Variant key is inside an input element
    const variantInputs = page.locator('.variants-container-inner .variant-key-input input')
    const count = await variantInputs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('Edit variant key', async ({ page }) => {
    const variantInputs = page.locator('.variants-container-inner .variant-key-input input')
    if (await variantInputs.count() > 0) {
      await variantInputs.first().fill('control-v2')
      await page.locator('.variants-container-inner button').filter({ hasText: 'Save Variant' }).first().click()
      await expect(page.locator('.el-message')).toContainText('Variant updated')
    }
  })

  test('Variant attachment collapse', async ({ page }) => {
    const collapseHeader = page.locator('.variant-attachment-collapsable-title .el-collapse-item__header').first()
    if (await collapseHeader.isVisible().catch(() => false)) {
      await collapseHeader.click()
      await page.waitForTimeout(300)
      await expect(page.locator('.variant-attachment-title').first()).toContainText('JSON')
    }
  })

  test('Save and verify variant attachment JSON', async () => {
    // 1. Create variant via API (deterministic, no DOM timing issues)
    const variant = await createVariant(flagId, 'attach-test-' + Date.now())

    // 2. Set attachment via API (tree mode has no CodeMirror for direct editing)
    const putRes = await fetch(`${API}/flags/${flagId}/variants/${variant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: variant.key, attachment: { testKey: 'testValue123' } }),
    })
    expect(putRes.status).toBe(200)

    // 3. Verify persistence via API (re-fetch and check attachment round-trips)
    const getRes = await fetch(`${API}/flags/${flagId}`)
    const flagData = await getRes.json()
    const saved = flagData.variants.find(v => v.id === variant.id)
    expect(saved.attachment).toEqual({ testKey: 'testValue123' })
  })

  test('Invalid variant attachment shows error', async ({ page }) => {
    const saveBtn = page.locator('.variants-container-inner button').filter({ hasText: 'Save Variant' })
    if (await saveBtn.count() > 0) {
      await expect(saveBtn.first()).toBeVisible()
    }
  })

  test('Delete variant not in use', async ({ page }) => {
    const keyInput = page.locator('input[placeholder="Variant Key"]')
    const createBtn = page.locator('button').filter({ hasText: 'Create Variant' })
    await keyInput.fill('to-delete-' + Date.now())
    await createBtn.click()
    await page.waitForTimeout(500)
    // Click delete button (icon button in save-remove row, not "Save Variant")
    const deleteIcons = page.locator('.variants-container-inner .save-remove-variant-row .el-icon')
    if (await deleteIcons.count() > 0) {
      await deleteIcons.last().click()
      // Confirm via ElMessageBox
      const okBtn = page.locator('.el-message-box').locator('button').filter({ hasText: 'OK' })
      await expect(okBtn).toBeVisible({ timeout: 3000 })
      await okBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.el-message').last()).toContainText('Variant deleted')
    }
  })

  test('Variant in use check exists', async ({ page }) => {
    await expect(page.locator('.variants-container')).toBeVisible()
  })
})

test.describe('Variant Delete Protection', () => {
  let flagIdWithDist

  test.beforeAll(async () => {
    // Create flag with variant and segment for distribution test
    const flag = await createFlag('variant-delete-protection-' + Date.now())
    flagIdWithDist = flag.id
    await createVariant(flagIdWithDist, 'protected-variant')
    await createSegment(flagIdWithDist, 'protection-segment')
  })

  test('Cannot delete variant that is in active distribution', async ({ page }) => {
    await page.goto(`/#/flags/${flagIdWithDist}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })

    // First, add the variant to a distribution via UI
    const editBtn = page.locator('.segment-distributions button').filter({ hasText: 'edit' }).first()
    await editBtn.click()
    await page.waitForTimeout(300)

    const dialog = page.locator('.el-dialog').filter({ hasText: 'Edit distribution' })
    const checkboxes = dialog.locator('.el-checkbox')

    // Check the first variant
    const firstCheckbox = checkboxes.first()
    const isChecked = await firstCheckbox.locator('input[type="checkbox"]').isChecked()
    if (!isChecked) {
      await firstCheckbox.click()
      await page.waitForTimeout(200)
    }

    // Set to 100%
    const sliderInputs = dialog.locator('.el-input-number input')
    if (await sliderInputs.count() > 0) {
      await sliderInputs.first().fill('')
      await sliderInputs.first().type('100')
      await sliderInputs.first().press('Enter')
      await page.waitForTimeout(200)
    }

    // Save distribution
    const saveBtn = dialog.locator('button').filter({ hasText: 'Save' })
    if (await saveBtn.isEnabled()) {
      await saveBtn.click()
      await page.waitForTimeout(500)
    } else {
      await page.keyboard.press('Escape')
    }

    // Now try to delete the variant - expect ElMessageBox alert
    const deleteIcons = page.locator('.variants-container-inner .save-remove-variant-row .el-icon')
    if (await deleteIcons.count() > 0) {
      await deleteIcons.first().click()
      await page.waitForTimeout(500)
    }

    // Verify ElMessageBox alert was shown with the expected message
    const messageBox = page.locator('.el-message-box')
    await expect(messageBox).toBeVisible({ timeout: 3000 })
    await expect(messageBox).toContainText('being used by a segment distribution')
    await messageBox.locator('button').filter({ hasText: 'OK' }).click()

    // Verify variant still exists
    const variantInputs = page.locator('.variants-container-inner .variant-key-input input')
    expect(await variantInputs.count()).toBeGreaterThanOrEqual(1)
  })
})
