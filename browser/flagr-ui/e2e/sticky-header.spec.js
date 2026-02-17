import { test, expect } from '@playwright/test'
const { createFlag } = require('./helpers')

let flagId

test.describe('Sticky Flag Header', () => {
  test.beforeAll(async () => {
    const flag = await createFlag('sticky-header-test-' + Date.now())
    flagId = flag.id
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-config-card', { timeout: 10000 })
  })

  test('Header shows flag key or flag ID', async ({ page }) => {
    const header = page.locator('.sticky-flag-header')
    await expect(header).toBeVisible()
    const headerText = await header.locator('.sticky-flag-header__key').textContent()
    // Should show either the flag key or "Flag <id>"
    expect(headerText.length).toBeGreaterThan(0)
  })

  test('Save button visible in sticky header', async ({ page }) => {
    const saveBtn = page.locator('.sticky-flag-header .el-button').filter({ hasText: 'Save Flag' })
    await expect(saveBtn).toBeVisible()
  })

  test('Save button disabled when no changes made', async ({ page }) => {
    const saveBtn = page.locator('.sticky-flag-header .el-button').filter({ hasText: 'Save Flag' })
    await expect(saveBtn).toBeDisabled()
  })

  test('Editing flag description shows "Unsaved changes" tag', async ({ page }) => {
    const descInput = page.locator('.flag-content input[placeholder="Description"]')
    await descInput.fill('modified description ' + Date.now())
    await page.waitForTimeout(300)
    const tag = page.locator('.sticky-flag-header .el-tag').filter({ hasText: 'Unsaved changes' })
    await expect(tag).toBeVisible()
  })

  test('Save button becomes enabled when changes detected', async ({ page }) => {
    const descInput = page.locator('.flag-content input[placeholder="Description"]')
    await descInput.fill('modified description ' + Date.now())
    await page.waitForTimeout(300)
    const saveBtn = page.locator('.sticky-flag-header .el-button').filter({ hasText: 'Save Flag' })
    await expect(saveBtn).not.toBeDisabled()
  })

  test('After saving, "Unsaved changes" tag disappears', async ({ page }) => {
    const descInput = page.locator('.flag-content input[placeholder="Description"]')
    await descInput.fill('saved description ' + Date.now())
    await page.waitForTimeout(300)

    const saveBtn = page.locator('.sticky-flag-header .el-button').filter({ hasText: 'Save Flag' })
    await saveBtn.click()
    await expect(page.locator('.el-message').last()).toContainText('Flag updated')
    await page.waitForTimeout(500)

    const tag = page.locator('.sticky-flag-header .el-tag').filter({ hasText: 'Unsaved changes' })
    await expect(tag).not.toBeVisible()
  })
})
