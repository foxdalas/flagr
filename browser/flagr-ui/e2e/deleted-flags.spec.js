import { test, expect } from '@playwright/test'

test.describe('Deleted Flags', () => {
  test('Deleted flags section loads lazily', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.flags-container')

    // Collapse is closed by default
    const collapse = page.locator('.deleted-flags-table')
    await expect(collapse).toBeVisible()

    // Open it - click on the title
    await collapse.locator('.el-collapse-item__header').click()
    await page.waitForTimeout(500)
  })

  test('Deleted flag displays after deletion', async ({ page }) => {
    // Create a flag
    await page.goto('/')
    await page.waitForSelector('.flags-container')

    const descInput = page.locator('input[placeholder="Specific new flag description"]')
    const createBtn = page.locator('button').filter({ hasText: 'Create New Flag' })

    const flagName = 'to-delete-' + Date.now()
    await descInput.fill(flagName)
    await createBtn.click()
    await page.waitForTimeout(500)

    // Auto-navigated to flag detail page
    await page.waitForSelector('.flag-container', { timeout: 10000 })

    // Delete the flag — type key to confirm
    const deleteBtn = page.locator('button').filter({ hasText: 'Delete Flag' })
    await deleteBtn.click()

    // Get the flag key from the input and type it to confirm
    const flagKeyInput = page.locator('.flag-config-card .variant-key-input input, .flag-config-card .flag-content input').first()
    const flagKey = await flagKeyInput.inputValue()
    const deleteDialog = page.locator('.el-dialog').filter({ hasText: 'Delete feature flag' })
    await deleteDialog.locator('input[placeholder="Type flag key to confirm"]').fill(flagKey)
    const confirmDeleteBtn = deleteDialog.locator('button').filter({ hasText: 'Delete' })
    await expect(confirmDeleteBtn).toBeEnabled({ timeout: 3000 })
    await confirmDeleteBtn.click()

    await page.waitForTimeout(1000)

    // Should redirect to home
    await page.waitForURL(/\/#\/$/, { timeout: 5000 })

    // Open deleted flags
    const collapse = page.locator('.deleted-flags-table')
    await collapse.locator('.el-collapse-item__header').click()
    await page.waitForTimeout(1000)

    // Deleted flag should be in the table
    await expect(collapse.locator('.el-table__body').first()).toContainText(flagName)
  })

  test('Restore deleted flag', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.flags-container')

    // Open deleted flags
    const collapse = page.locator('.deleted-flags-table')
    await collapse.locator('.el-collapse-item__header').click()
    await page.waitForTimeout(1000)

    // Deleted flag from previous test should have a Restore button
    const restoreBtn = collapse.locator('button').filter({ hasText: 'Restore' }).first()
    await expect(restoreBtn).toBeVisible({ timeout: 5000 })
    await restoreBtn.click()

    // Handle confirm dialog
    const okBtn = page.locator('.el-message-box').locator('button').filter({ hasText: 'OK' })
    await expect(okBtn).toBeVisible({ timeout: 3000 })
    await okBtn.click()

    await page.waitForTimeout(500)
    await expect(page.locator('.el-message')).toContainText('Flag updated')
  })
})
