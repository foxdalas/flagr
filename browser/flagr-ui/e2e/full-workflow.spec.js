import { test, expect } from '@playwright/test'

test.describe('Full E2E Workflow', () => {
  test('Complete flag lifecycle', async ({ page }) => {

    // 1. Go to home, create flag
    await page.goto('/')
    await page.waitForSelector('.flags-container')

    const descInput = page.locator('input[placeholder="Specific new flag description"]')
    const createBtn = page.locator('button').filter({ hasText: 'Create New Flag' })
    const flagName = 'e2e-workflow-' + Date.now()

    await descInput.fill(flagName)
    await createBtn.click()
    await expect(page.locator('.el-message')).toContainText('Flag created')
    await page.waitForTimeout(1000)

    // 2. Auto-navigated to flag detail page
    await expect(page).toHaveURL(/\/#\/flags\/\d+/)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
    await expect(page.locator('.flag-config-card')).toBeVisible()

    // 3. Enable flag
    const switchEl = page.locator('.flag-config-card .el-card-header .el-switch')
    await switchEl.click()
    await page.waitForTimeout(1000)

    // 4-5. Create variants
    const variantInput = page.locator('input[placeholder="Variant Key"]')
    const createVarBtn = page.locator('button').filter({ hasText: 'Create Variant' })

    await variantInput.fill('control')
    await createVarBtn.click()
    await expect(page.locator('.el-message').last()).toContainText('Variant created')
    await page.waitForTimeout(1000)

    await variantInput.fill('treatment')
    await createVarBtn.click()
    await expect(page.locator('.el-message').last()).toContainText('Variant created')
    await page.waitForTimeout(1000)

    // 6. Create segment
    await page.locator('button').filter({ hasText: 'New Segment' }).first().click()
    const segDialog = page.locator('.el-dialog').filter({ hasText: 'Create segment' })
    await segDialog.locator('input[placeholder="Segment description"]').fill('all-users')
    await segDialog.locator('button').filter({ hasText: 'Create Segment' }).click()
    await expect(page.locator('.el-message').last()).toContainText('Segment created')
    await page.waitForTimeout(1000)

    // 7. Add constraint (values must be quoted for the backend parser)
    const segment = page.locator('.segment').first()
    const propInput = segment.locator('.constraints input[placeholder="Property"]').last()
    await propInput.fill('env')
    const constraintInputs = segment.locator('.constraints .el-col .el-input input')
    const lastConstraintInput = constraintInputs.last()
    await lastConstraintInput.fill('"production"')
    await segment.locator('button').filter({ hasText: 'Add Constraint' }).click()
    await expect(page.locator('.el-message').last()).toContainText('Constraint created')
    await page.waitForTimeout(1000)

    // 9. Create tag
    await page.locator('button').filter({ hasText: '+ New Tag' }).click()
    await page.waitForTimeout(300)
    const tagInput = page.locator('.tag-key-input input')
    await tagInput.fill('experiment')
    await tagInput.press('Enter')
    await page.waitForTimeout(1000)

    // 11. Save Flag
    await page.locator('button').filter({ hasText: 'Save Flag' }).first().click()
    await expect(page.locator('.el-message').last()).toContainText('Flag updated')
    await page.waitForTimeout(1000)

    // 12. Debug Console - POST evaluation (scope to first collapse item to avoid matching batch button)
    const evalCollapse = page.locator('.dc-container .el-collapse-item').first()
    await evalCollapse.locator('.el-collapse-item__header').click()
    await page.waitForTimeout(300)
    await evalCollapse.locator('button').filter({ hasText: /^\s*POST \/api\/v1\/evaluation\s*$/ }).click()
    await page.waitForTimeout(1000)

    // 14. History tab
    await page.locator('.el-tabs__item').filter({ hasText: 'History' }).click()
    await page.waitForTimeout(1000)

    // 15. Back to home
    await page.locator('.logo').click()
    await page.waitForSelector('.flags-container')
    await expect(page.locator('.flags-container .el-table__body').first()).toContainText(flagName)

    // 16. Search
    const searchInput = page.locator('input[placeholder="Search a flag"]')
    await searchInput.fill(flagName)
    await page.waitForTimeout(300)
    await expect(page.locator('.flags-container .el-table__body').first()).toContainText(flagName)
    await searchInput.fill('')
    await page.waitForTimeout(300)

    // 17. Delete flag
    await page.locator('.flags-container .el-table__body .el-table__row').filter({ hasText: flagName }).first().click()
    await page.waitForSelector('.flag-container', { timeout: 10000 })

    const deleteBtn = page.locator('button').filter({ hasText: 'Delete Flag' })
    await deleteBtn.click()
    // Type flag key to confirm deletion
    const deleteDialog = page.locator('.el-dialog').filter({ hasText: 'Delete feature flag' })
    await expect(deleteDialog).toBeVisible({ timeout: 3000 })
    const flagKeyInput = page.locator('.flag-config-card .flag-content input').first()
    const flagKey = await flagKeyInput.inputValue()
    await deleteDialog.locator('input[placeholder="Type flag key to confirm"]').fill(flagKey)
    const confirmDeleteBtn = deleteDialog.locator('button').filter({ hasText: 'Delete' })
    await expect(confirmDeleteBtn).toBeEnabled({ timeout: 3000 })
    await confirmDeleteBtn.click()
    await page.waitForTimeout(1000)
    await page.waitForSelector('.flags-container', { timeout: 5000 })
  })
})
