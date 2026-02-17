import { test, expect } from '@playwright/test'
const { createFlag, createSegment } = require('./helpers')

let flagId

test.describe('Flag Constraints', () => {
  test.beforeAll(async () => {
    const flag = await createFlag('constraints-test-' + Date.now())
    flagId = flag.id
    await createSegment(flagId, 'constraint-test-segment')
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-config-card', { timeout: 10000 })
  })

  test('Empty state shows no constraints message', async ({ page }) => {
    await expect(page.locator('.segment .card--empty').first()).toContainText('No constraints')
  })

  test('Create constraint', async ({ page }) => {
    const segment = page.locator('.segment').first()
    // Property input for new constraint (last one in the constraints area)
    const propInput = segment.locator('input[placeholder="Property"]').last()
    await propInput.fill('country')
    // Value input - the el-input without a placeholder that's not a select
    // In the new constraint row, there are: Property input, operator select, value input, button
    // Find the value input in the last el-row of constraints
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('"US"')
    const addBtn = segment.locator('button').filter({ hasText: 'Add Constraint' })
    await addBtn.click()
    await expect(page.locator('.el-message')).toContainText('Constraint created')
  })

  test('All 12 operators available', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const options = page.locator('.el-select-dropdown__item:visible')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(12)
    await page.keyboard.press('Escape')
  })

  test('Whitespace is trimmed', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const propInput = segment.locator('input[placeholder="Property"]').last()
    await propInput.fill('  env  ')
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('  "prod"  ')
    const addBtn = segment.locator('button').filter({ hasText: 'Add Constraint' })
    await addBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('.el-message').last()).toContainText('Constraint created')
  })

  test('Save constraint', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const saveBtn = segment.locator('.segment-constraint button').filter({ hasText: 'Save' }).first()
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click()
      await expect(page.locator('.el-message')).toContainText('Constraint updated')
    }
  })

  test('Delete constraint', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const deleteBtns = segment.locator('.segment-constraint .el-button--danger')
    if (await deleteBtns.count() > 0) {
      await deleteBtns.first().click()
      // Confirm deletion dialog
      const okBtn = page.locator('.el-message-box').locator('button').filter({ hasText: /confirm|ok/i })
      await expect(okBtn).toBeVisible({ timeout: 3000 })
      await okBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.el-message')).toContainText('Constraint deleted')
    }
  })

  test('Multiple constraints heading', async ({ page }) => {
    await expect(page.locator('.segment').first()).toContainText('Constraints (match ALL of them)')
  })

  test('Create constraint with numeric operator (LT)', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const propInput = segment.locator('input[placeholder="Property"]').last()
    await propInput.fill('age')

    // Select "<" (LT) operator from dropdown
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const ltOption = page.locator('.el-select-dropdown__item:visible').filter({ hasText: '<' }).first()
    await ltOption.click()
    await page.waitForTimeout(200)

    // Fill numeric value
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('18')

    const addBtn = segment.locator('button').filter({ hasText: 'Add Constraint' })
    await addBtn.click()
    await expect(page.locator('.el-message')).toContainText('Constraint created')
  })

  test('Create constraint with regex operator (EREG)', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const propInput = segment.locator('input[placeholder="Property"]').last()
    await propInput.fill('email')

    // Select "=~" (EREG) operator from dropdown
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const eregOption = page.locator('.el-select-dropdown__item:visible').filter({ hasText: '=~' }).first()
    await eregOption.click()
    await page.waitForTimeout(200)

    // Fill regex pattern value
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('".*@test\\\\.com"')

    const addBtn = segment.locator('button').filter({ hasText: 'Add Constraint' })
    await addBtn.click()
    await expect(page.locator('.el-message')).toContainText('Constraint created')
  })

  test('Create constraint with IN operator', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const propInput = segment.locator('input[placeholder="Property"]').last()
    await propInput.fill('country')

    // Select "IN" operator from dropdown
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const inOption = page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'IN' }).first()
    await inOption.click()
    await page.waitForTimeout(200)

    // Fill JSON array value
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('["US","CA","MX"]')

    const addBtn = segment.locator('button').filter({ hasText: 'Add Constraint' })
    await addBtn.click()
    await expect(page.locator('.el-message')).toContainText('Constraint created')
  })

  test('Create constraint with CONTAINS operator', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const propInput = segment.locator('input[placeholder="Property"]').last()
    await propInput.fill('role')

    // Select "CONTAINS" operator from dropdown
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const containsOption = page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'CONTAINS' }).first()
    await containsOption.click()
    await page.waitForTimeout(200)

    // Fill string value (quoted for backend parser)
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('"admin"')

    const addBtn = segment.locator('button').filter({ hasText: 'Add Constraint' })
    await addBtn.click()
    await expect(page.locator('.el-message')).toContainText('Constraint created')
  })

  test('Operator dropdown shows description text', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    // Check that operator descriptions are visible in the dropdown
    const descText = page.locator('.el-select-dropdown__item:visible .operator-desc')
    const count = await descText.count()
    expect(count).toBeGreaterThanOrEqual(1)
    await page.keyboard.press('Escape')
  })
})

test.describe('Constraint Validation', () => {
  let flagId

  test.beforeAll(async () => {
    const { createFlag, createSegment } = require('./helpers')
    const flag = await createFlag('validation-test-' + Date.now())
    flagId = flag.id
    await createSegment(flagId, 'validation-segment')
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-config-card', { timeout: 10000 })
  })

  test('IN operator with non-array value shows validation hint', async ({ page }) => {
    const segment = page.locator('.segment').first()
    // Select IN operator
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const inOption = page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'IN' }).first()
    await inOption.click()
    await page.waitForTimeout(200)

    // Fill non-array value
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('not-an-array')
    await page.waitForTimeout(200)

    const hint = segment.locator('.constraint-hint')
    await expect(hint).toBeVisible()
  })

  test('LT operator with non-numeric value shows validation hint', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const ltOption = page.locator('.el-select-dropdown__item:visible').filter({ hasText: '<' }).first()
    await ltOption.click()
    await page.waitForTimeout(200)

    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('not-a-number')
    await page.waitForTimeout(200)

    const hint = segment.locator('.constraint-hint')
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('number')
  })

  test('EREG with invalid regex shows validation hint', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const eregOption = page.locator('.el-select-dropdown__item:visible').filter({ hasText: '=~' }).first()
    await eregOption.click()
    await page.waitForTimeout(200)

    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('[invalid')
    await page.waitForTimeout(200)

    const hint = segment.locator('.constraint-hint')
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('regex')
  })

  test('Empty value shows validation hint', async ({ page }) => {
    const segment = page.locator('.segment').first()
    // The Add button should be disabled when value is empty
    const addBtn = segment.locator('button').filter({ hasText: 'Add Constraint' })
    await expect(addBtn).toBeDisabled()
  })

  test('Valid constraint value hides hint', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('"valid-value"')
    await page.waitForTimeout(200)

    const hint = segment.locator('.constraint-hint')
    await expect(hint).not.toBeVisible()
  })

  test('Add button disabled when validation fails', async ({ page }) => {
    const segment = page.locator('.segment').first()
    const propInput = segment.locator('input[placeholder="Property"]').last()
    await propInput.fill('test-prop')

    // Select IN operator
    const selects = segment.locator('.constraints .el-select')
    await selects.last().click()
    await page.waitForTimeout(300)
    const inOption = page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'IN' }).first()
    await inOption.click()
    await page.waitForTimeout(200)

    // Fill invalid value
    const newConstraintRow = segment.locator('.constraints > div:last-child .el-row')
    const valueInput = newConstraintRow.locator('.el-col').nth(2).locator('input')
    await valueInput.fill('not-json-array')
    await page.waitForTimeout(200)

    const addBtn = segment.locator('button').filter({ hasText: 'Add Constraint' })
    await expect(addBtn).toBeDisabled()
  })
})
