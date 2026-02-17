import { test, expect } from '@playwright/test'
const { API, createFlag, createVariant, createSegment } = require('./helpers')

// --- Helpers ---

async function setDistributionViaAPI(flagId, segmentId, distributions) {
  const res = await fetch(`${API}/flags/${flagId}/segments/${segmentId}/distributions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ distributions }),
  })
  return res.json()
}

async function openDistributionDialog(page) {
  const editBtn = page.locator('.segment-distributions button').filter({ hasText: 'edit' }).first()
  await editBtn.click()
  const dialog = page.locator('.el-dialog').filter({ hasText: 'Edit distribution' })
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(300)
  return dialog
}

async function checkAllVariants(dialog, page) {
  const checkboxes = dialog.locator('.el-checkbox')
  const count = await checkboxes.count()
  for (let i = 0; i < count; i++) {
    const cb = checkboxes.nth(i)
    const isChecked = await cb.evaluate(el => el.classList.contains('is-checked'))
    if (!isChecked) {
      await cb.click()
      await page.waitForTimeout(200)
    }
  }
}

async function uncheckAllVariants(dialog, page) {
  const checkboxes = dialog.locator('.el-checkbox')
  const count = await checkboxes.count()
  for (let i = 0; i < count; i++) {
    const cb = checkboxes.nth(i)
    const isChecked = await cb.evaluate(el => el.classList.contains('is-checked'))
    if (isChecked) {
      await cb.click()
      await page.waitForTimeout(200)
    }
  }
}

async function setSliderValue(input, value, page) {
  await input.fill('')
  await input.type(String(value))
  await input.press('Enter')
  await page.waitForTimeout(200)
}

function getEnabledInputs(dialog) {
  return dialog.locator('.el-input-number:not(.is-disabled) input')
}

function getDistributionCards(page) {
  return page.locator('.segment-distributions .distribution-card')
}

// --- Test Groups ---

test.describe('1. Full Save Flow', () => {
  let flagId

  test.beforeAll(async () => {
    const flag = await createFlag('dist-save-' + Date.now())
    flagId = flag.id
    await createVariant(flagId, 'control')
    await createVariant(flagId, 'treatment')
    await createSegment(flagId, 'test-segment')
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
  })

  test('Save 50/50 distribution creates two distribution cards', async ({ page }) => {
    const dialog = await openDistributionDialog(page)
    await checkAllVariants(dialog, page)

    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(2)

    await setSliderValue(inputs.nth(0), 50, page)
    await setSliderValue(inputs.nth(1), 50, page)

    const saveBtn = dialog.locator('button').filter({ hasText: 'Save' })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()
    await expect(page.locator('.el-message')).toContainText('Distribution updated')

    const cards = getDistributionCards(page)
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(0)).toContainText('control')
    await expect(cards.nth(0)).toContainText('50%')
    await expect(cards.nth(1)).toContainText('treatment')
    await expect(cards.nth(1)).toContainText('50%')
  })

  test('Distribution persists after reload and dialog reopens with correct values', async ({ page }) => {
    const cards = getDistributionCards(page)
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(0)).toContainText('50%')
    await expect(cards.nth(1)).toContainText('50%')

    await page.reload()
    await page.waitForSelector('.flag-container', { timeout: 10000 })

    const cardsAfter = getDistributionCards(page)
    await expect(cardsAfter).toHaveCount(2)
    await expect(cardsAfter.nth(0)).toContainText('50%')
    await expect(cardsAfter.nth(1)).toContainText('50%')

    const dialog = await openDistributionDialog(page)
    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(2)
    await expect(inputs.nth(0)).toHaveValue('50')
    await expect(inputs.nth(1)).toHaveValue('50')
    await page.keyboard.press('Escape')
  })
})

test.describe('2. Round-Trip Persistence', () => {
  let flagId, segmentId, variants

  test.beforeAll(async () => {
    const flag = await createFlag('dist-roundtrip-' + Date.now())
    flagId = flag.id
    const v1 = await createVariant(flagId, 'control')
    const v2 = await createVariant(flagId, 'treatment')
    variants = [v1, v2]
    const seg = await createSegment(flagId, 'test-segment')
    segmentId = seg.id

    await setDistributionViaAPI(flagId, segmentId, [
      { variantID: v1.id, variantKey: 'control', percent: 60, bitmap: '' },
      { variantID: v2.id, variantKey: 'treatment', percent: 40, bitmap: '' },
    ])
  })

  test('API-set 60/40 shows correctly in cards and dialog, survives reload', async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })

    const cards = getDistributionCards(page)
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(0)).toContainText('control')
    await expect(cards.nth(0)).toContainText('60%')
    await expect(cards.nth(1)).toContainText('treatment')
    await expect(cards.nth(1)).toContainText('40%')

    const dialog = await openDistributionDialog(page)
    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(2)
    await expect(inputs.nth(0)).toHaveValue('60')
    await expect(inputs.nth(1)).toHaveValue('40')
    await page.keyboard.press('Escape')

    await page.reload()
    await page.waitForSelector('.flag-container', { timeout: 10000 })

    const cardsAfter = getDistributionCards(page)
    await expect(cardsAfter).toHaveCount(2)
    await expect(cardsAfter.nth(0)).toContainText('60%')
    await expect(cardsAfter.nth(1)).toContainText('40%')
  })
})

test.describe('3. Modify Existing Distribution', () => {
  let flagId, segmentId, variants

  test.beforeAll(async () => {
    const flag = await createFlag('dist-modify-' + Date.now())
    flagId = flag.id
    const v1 = await createVariant(flagId, 'control')
    const v2 = await createVariant(flagId, 'treatment')
    variants = [v1, v2]
    const seg = await createSegment(flagId, 'test-segment')
    segmentId = seg.id

    await setDistributionViaAPI(flagId, segmentId, [
      { variantID: v1.id, variantKey: 'control', percent: 50, bitmap: '' },
      { variantID: v2.id, variantKey: 'treatment', percent: 50, bitmap: '' },
    ])
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
  })

  test('Change 50/50 to 70/30 and verify cards update', async ({ page }) => {
    const dialog = await openDistributionDialog(page)
    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(2)
    await expect(inputs.nth(0)).toHaveValue('50')
    await expect(inputs.nth(1)).toHaveValue('50')

    await setSliderValue(inputs.nth(0), 70, page)
    await setSliderValue(inputs.nth(1), 30, page)

    const saveBtn = dialog.locator('button').filter({ hasText: 'Save' })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()
    await expect(page.locator('.el-message')).toContainText('Distribution updated')

    const cards = getDistributionCards(page)
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(0)).toContainText('70%')
    await expect(cards.nth(1)).toContainText('30%')
  })

  test('Uncheck one variant, set other to 100%, results in single card', async ({ page }) => {
    // After previous test, distribution is 70/30
    const dialog = await openDistributionDialog(page)

    // Uncheck the second variant (treatment)
    const checkboxes = dialog.locator('.el-checkbox')
    const secondCb = checkboxes.nth(1)
    const isChecked = await secondCb.evaluate(el => el.classList.contains('is-checked'))
    expect(isChecked).toBe(true)
    await secondCb.click()
    await page.waitForTimeout(200)

    // Now only one enabled input should remain
    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(1)

    await setSliderValue(inputs.nth(0), 100, page)

    const saveBtn = dialog.locator('button').filter({ hasText: 'Save' })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()
    await expect(page.locator('.el-message')).toContainText('Distribution updated')

    const cards = getDistributionCards(page)
    await expect(cards).toHaveCount(1)
    await expect(cards.nth(0)).toContainText('control')
    await expect(cards.nth(0)).toContainText('100%')
  })
})

test.describe('4. Presets', () => {
  let flagId

  test.beforeAll(async () => {
    const flag = await createFlag('dist-presets-' + Date.now())
    flagId = flag.id
    await createVariant(flagId, 'control')
    await createVariant(flagId, 'treatment')
    await createSegment(flagId, 'test-segment')
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
  })

  test('Even Split preset sets 50/50', async ({ page }) => {
    const dialog = await openDistributionDialog(page)
    await checkAllVariants(dialog, page)

    await dialog.locator('button').filter({ hasText: 'Even Split' }).click()
    await page.waitForTimeout(200)

    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(2)
    await expect(inputs.nth(0)).toHaveValue('50')
    await expect(inputs.nth(1)).toHaveValue('50')
    await page.keyboard.press('Escape')
  })

  test('100% Control preset sets 100/0', async ({ page }) => {
    const dialog = await openDistributionDialog(page)
    await checkAllVariants(dialog, page)

    await dialog.locator('button').filter({ hasText: '100% Control' }).click()
    await page.waitForTimeout(200)

    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(2)
    await expect(inputs.nth(0)).toHaveValue('100')
    await expect(inputs.nth(1)).toHaveValue('0')
    await page.keyboard.press('Escape')
  })

  test('Canary 1/99 preset sets 1/99', async ({ page }) => {
    const dialog = await openDistributionDialog(page)
    await checkAllVariants(dialog, page)

    await dialog.locator('button').filter({ hasText: 'Canary 1/99' }).click()
    await page.waitForTimeout(200)

    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(2)
    await expect(inputs.nth(0)).toHaveValue('1')
    await expect(inputs.nth(1)).toHaveValue('99')
    await page.keyboard.press('Escape')
  })

  test('Gradual 10/90 preset sets 10/90', async ({ page }) => {
    const dialog = await openDistributionDialog(page)
    await checkAllVariants(dialog, page)

    await dialog.locator('button').filter({ hasText: 'Gradual 10/90' }).click()
    await page.waitForTimeout(200)

    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(2)
    await expect(inputs.nth(0)).toHaveValue('10')
    await expect(inputs.nth(1)).toHaveValue('90')
    await page.keyboard.press('Escape')
  })
})

test.describe('5. Cancel Discards Changes', () => {
  let flagId, segmentId, variants

  test.beforeAll(async () => {
    const flag = await createFlag('dist-cancel-' + Date.now())
    flagId = flag.id
    const v1 = await createVariant(flagId, 'control')
    const v2 = await createVariant(flagId, 'treatment')
    variants = [v1, v2]
    const seg = await createSegment(flagId, 'test-segment')
    segmentId = seg.id

    await setDistributionViaAPI(flagId, segmentId, [
      { variantID: v1.id, variantKey: 'control', percent: 50, bitmap: '' },
      { variantID: v2.id, variantKey: 'treatment', percent: 50, bitmap: '' },
    ])
  })

  test('Escape discards changes, cards and dialog retain original values', async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })

    // Open dialog and change first variant to 80
    const dialog = await openDistributionDialog(page)
    const inputs = getEnabledInputs(dialog)
    await setSliderValue(inputs.nth(0), 80, page)

    // Cancel
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Cards should still show 50/50
    const cards = getDistributionCards(page)
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(0)).toContainText('50%')
    await expect(cards.nth(1)).toContainText('50%')

    // Reopen dialog — should show original 50/50
    const dialog2 = await openDistributionDialog(page)
    const inputs2 = getEnabledInputs(dialog2)
    await expect(inputs2).toHaveCount(2)
    await expect(inputs2.nth(0)).toHaveValue('50')
    await expect(inputs2.nth(1)).toHaveValue('50')
    await page.keyboard.press('Escape')
  })
})

test.describe('6. Three Variants', () => {
  let flagId

  test.beforeAll(async () => {
    const flag = await createFlag('dist-three-' + Date.now())
    flagId = flag.id
    await createVariant(flagId, 'control')
    await createVariant(flagId, 'treatment-a')
    await createVariant(flagId, 'treatment-b')
    await createSegment(flagId, 'test-segment')
  })

  test('Even split with 3 variants gives 34/33/33 and saves correctly', async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })

    const dialog = await openDistributionDialog(page)
    await checkAllVariants(dialog, page)

    await dialog.locator('button').filter({ hasText: 'Even Split' }).click()
    await page.waitForTimeout(200)

    const inputs = getEnabledInputs(dialog)
    await expect(inputs).toHaveCount(3)
    await expect(inputs.nth(0)).toHaveValue('34')
    await expect(inputs.nth(1)).toHaveValue('33')
    await expect(inputs.nth(2)).toHaveValue('33')

    const saveBtn = dialog.locator('button').filter({ hasText: 'Save' })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()
    await expect(page.locator('.el-message')).toContainText('Distribution updated')

    const cards = getDistributionCards(page)
    await expect(cards).toHaveCount(3)
    await expect(cards.nth(0)).toContainText('control')
    await expect(cards.nth(0)).toContainText('34%')
    await expect(cards.nth(1)).toContainText('treatment-a')
    await expect(cards.nth(1)).toContainText('33%')
    await expect(cards.nth(2)).toContainText('treatment-b')
    await expect(cards.nth(2)).toContainText('33%')
  })
})

test.describe('7. Validation', () => {
  let flagId

  test.beforeAll(async () => {
    const flag = await createFlag('dist-validation-' + Date.now())
    flagId = flag.id
    await createVariant(flagId, 'control')
    await createVariant(flagId, 'treatment')
    await createSegment(flagId, 'test-segment')
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
  })

  test('No variants selected keeps Save disabled with 0% alert', async ({ page }) => {
    const dialog = await openDistributionDialog(page)
    await uncheckAllVariants(dialog, page)

    const saveBtn = dialog.locator('button').filter({ hasText: 'Save' })
    await expect(saveBtn).toBeDisabled()
    await expect(dialog.locator('.el-alert')).toContainText('0%')
    await page.keyboard.press('Escape')
  })

  test('Sum of 90% keeps Save disabled with percentage alert', async ({ page }) => {
    const dialog = await openDistributionDialog(page)
    await checkAllVariants(dialog, page)

    const inputs = getEnabledInputs(dialog)
    await setSliderValue(inputs.nth(0), 50, page)
    await setSliderValue(inputs.nth(1), 40, page)

    const saveBtn = dialog.locator('button').filter({ hasText: 'Save' })
    await expect(saveBtn).toBeDisabled()
    await expect(dialog.locator('.el-alert')).toContainText('90%')
    await page.keyboard.press('Escape')
  })
})
