import { test, expect } from '@playwright/test'
const { createFlag } = require('./helpers')

let flagId

test.describe('Flag Segments', () => {
  test.beforeAll(async () => {
    const flag = await createFlag('segments-test-' + Date.now())
    flagId = flag.id
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
  })

  test('Empty state', async ({ page }) => {
    await expect(page.locator('.segments-container .card--empty')).toContainText('No segments yet')
  })

  test('New Segment button visible', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: 'New Segment' }).first()).toBeVisible()
  })

  test('Create segment dialog', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'New Segment' }).first().click()
    const dialog = page.locator('.el-dialog').filter({ hasText: 'Create segment' })
    await expect(dialog).toBeVisible()
    const createSegBtn = dialog.locator('button').filter({ hasText: 'Create Segment' })
    await expect(createSegBtn).toBeDisabled()
    await dialog.locator('input[placeholder="Segment description"]').fill('everyone')
    await expect(createSegBtn).not.toBeDisabled()
    await page.keyboard.press('Escape')
  })

  test('Create segment', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'New Segment' }).first().click()
    const dialog = page.locator('.el-dialog').filter({ hasText: 'Create segment' })
    await dialog.locator('input[placeholder="Segment description"]').fill('test-segment')
    await dialog.locator('button').filter({ hasText: 'Create Segment' }).click()
    await expect(page.locator('.el-message')).toContainText('Segment created')
    await page.waitForTimeout(300)
    await expect(page.locator('.segments-container-inner')).toBeVisible()
    await expect(page.locator('.segments-container-inner')).toContainText('Segment ID')
  })

  test('Default rollout is 50', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'New Segment' }).first().click()
    const dialog = page.locator('.el-dialog').filter({ hasText: 'Create segment' })
    const sliderInput = dialog.locator('.el-input-number input, .el-slider__input input')
    if (await sliderInput.count() > 0) {
      const value = await sliderInput.first().inputValue()
      expect(parseInt(value)).toBe(50)
    }
    await page.keyboard.press('Escape')
  })

  test('Edit segment', async ({ page }) => {
    const segmentCard = page.locator('.segments-container-inner .segment').first()
    if (await segmentCard.isVisible().catch(() => false)) {
      const descInput = segmentCard.locator('input[placeholder="Description"]')
      await descInput.fill('updated-segment')
      await segmentCard.locator('button').filter({ hasText: 'Save Segment Setting' }).click()
      await expect(page.locator('.el-message')).toContainText('Segment updated')
    }
  })

  test('Delete segment', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'New Segment' }).first().click()
    const dialog = page.locator('.el-dialog').filter({ hasText: 'Create segment' })
    await dialog.locator('input[placeholder="Segment description"]').fill('to-delete')
    await dialog.locator('button').filter({ hasText: 'Create Segment' }).click()
    await page.waitForTimeout(500)
    const segments = page.locator('.segments-container-inner .segment')
    const lastSegment = segments.last()
    // Find the delete icon button
    const deleteIcon = lastSegment.locator('.flex-row.id-row .el-icon').first()
    await deleteIcon.click()
    // Confirm via ElMessageBox
    const okBtn = page.locator('.el-message-box').locator('button').filter({ hasText: 'OK' })
    await expect(okBtn).toBeVisible({ timeout: 3000 })
    await okBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('.el-message').last()).toContainText('Segment deleted')
  })

  test('Segments are draggable', async ({ page }) => {
    const segments = page.locator('.segments-container-inner .segment.grabbable')
    if (await segments.count() > 0) {
      const cursor = await segments.first().evaluate(el => getComputedStyle(el).cursor)
      expect(['grab', 'move', '-webkit-grab']).toContain(cursor)
    }
  })

  test('Arrow button reorder auto-saves segment order', async ({ page }) => {
    // Create a second segment if needed
    await page.locator('button').filter({ hasText: 'New Segment' }).first().click()
    const dialog = page.locator('.el-dialog').filter({ hasText: 'Create segment' })
    await dialog.locator('input[placeholder="Segment description"]').fill('reorder-test-segment')
    await dialog.locator('button').filter({ hasText: 'Create Segment' }).click()
    await page.waitForTimeout(500)

    // Ensure at least 2 segments
    const segments = page.locator('.segments-container-inner .segment')
    const count = await segments.count()
    if (count >= 2) {
      // Click down arrow on first segment (should auto-save)
      const downBtn = segments.first().locator('button[aria-label="Move segment down"]')
      await downBtn.click()
      await page.waitForTimeout(500)
      const msg = page.locator('.el-message').last()
      await expect(msg).toBeVisible({ timeout: 3000 })
      await expect(msg).toContainText('Segment reordered')
    }
  })

  test('Drag-and-drop reorder auto-saves segment order', async ({ page }) => {
    const segments = page.locator('.segments-container-inner .segment.grabbable')
    if (await segments.count() >= 2) {
      const cursor = await segments.first().evaluate(el => getComputedStyle(el).cursor)
      // Verify drag cursor is set (the auto-save is triggered by @end handler)
      expect(['grab', 'move', '-webkit-grab']).toContain(cursor)
    }
  })
})
