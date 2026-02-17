import { test, expect } from '@playwright/test'
const { createFlag } = require('./helpers')

let flagId

test.describe('Programmatic Components CSS', () => {
  test.beforeAll(async () => {
    const flag = await createFlag('css-test-' + Date.now())
    flagId = flag.id
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
  })

  test('ElMessageBox "Unsaved changes" dialog is styled', async ({ page }) => {
    // Change description to trigger isDirty
    const descInput = page.locator('.flag-content input[placeholder="Description"]')
    await descInput.fill('changed-' + Date.now())
    await page.waitForTimeout(500)

    // Navigate away via breadcrumb to trigger onBeforeRouteLeave
    await page.locator('.el-breadcrumb__inner').filter({ hasText: 'Flags' }).click()

    // Wait for the message box
    const messageBox = page.locator('.el-message-box')
    await expect(messageBox).toBeVisible({ timeout: 5000 })

    // Verify CSS is applied — without styles the box stretches to 100% width
    const boxWidth = await messageBox.evaluate(el => getComputedStyle(el).width)
    expect(parseInt(boxWidth)).toBeLessThan(600)

    // Header should have padding (without CSS it's 0)
    const headerPadding = await page.locator('.el-message-box__header')
      .evaluate(el => getComputedStyle(el).padding)
    expect(headerPadding).not.toBe('0px')

    // Buttons container should be flex (without CSS it's block, buttons stack vertically)
    const btnsDisplay = await page.locator('.el-message-box__btns')
      .evaluate(el => getComputedStyle(el).display)
    expect(btnsDisplay).toBe('flex')

    // Overlay should have a semi-transparent background
    const overlayBg = await page.locator('.el-overlay.is-message-box')
      .evaluate(el => getComputedStyle(el).backgroundColor)
    expect(overlayBg).toMatch(/rgba/)

    // Click Stay to remain on the page
    await page.locator('.el-message-box').locator('button').filter({ hasText: 'Stay' }).click()
  })

  test('ElMessage toast "Flag updated" is styled', async ({ page }) => {
    // Use .last() to get the inner card button (sticky header button is disabled when no changes)
    await page.locator('button').filter({ hasText: 'Save Flag' }).last().click()

    const message = page.locator('.el-message')
    await expect(message).toBeVisible({ timeout: 5000 })

    // Without CSS, the toast is position: static and blends into the page
    const position = await message.evaluate(el => getComputedStyle(el).position)
    expect(position).toBe('fixed')

    const zIndex = await message.evaluate(el => getComputedStyle(el).zIndex)
    expect(parseInt(zIndex)).toBeGreaterThan(1000)

    const display = await message.evaluate(el => getComputedStyle(el).display)
    expect(display).toBe('flex')
  })

  test('ElMessageBox "Remove tag" confirm dialog is styled', async ({ page }) => {
    // Create a tag first
    await page.locator('button').filter({ hasText: '+ New Tag' }).click()
    await page.waitForTimeout(300)
    const tagInput = page.locator('.tag-key-input input')
    const tagName = 'css-del-' + Date.now()
    await tagInput.fill(tagName)
    await tagInput.press('Enter')
    await page.waitForTimeout(500)

    // Click close button on the tag
    const tag = page.locator('.tags-container-inner .el-tag').filter({ hasText: tagName })
    await tag.locator('.el-tag__close, .el-icon-close').click()

    // Wait for confirm dialog
    const messageBox = page.locator('.el-message-box')
    await expect(messageBox).toBeVisible({ timeout: 5000 })

    // Same CSS checks as unsaved changes dialog
    const boxWidth = await messageBox.evaluate(el => getComputedStyle(el).width)
    expect(parseInt(boxWidth)).toBeLessThan(600)

    const headerPadding = await page.locator('.el-message-box__header')
      .evaluate(el => getComputedStyle(el).padding)
    expect(headerPadding).not.toBe('0px')

    const btnsDisplay = await page.locator('.el-message-box__btns')
      .evaluate(el => getComputedStyle(el).display)
    expect(btnsDisplay).toBe('flex')

    // Cancel to clean up
    await page.locator('.el-message-box').locator('button').filter({ hasText: 'Cancel' }).click()
  })
})
