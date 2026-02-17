import { test, expect } from '@playwright/test'
const { API, createFlag, createVariant, createSegment } = require('./helpers')

/**
 * Tests proving Vue3 migration regressions in Flag.vue.
 *
 * These tests are designed to FAIL on the current (broken) code,
 * proving the bugs exist. After fixes, they should all PASS.
 */

// ─── F1: el-row flex shrink ─────────────────────────────────────
// In Element Plus, <el-row> is always display:flex.
// Children without <el-col> shrink to content width instead of 100%.

test.describe('F1: el-row flex shrink — layout bugs', () => {
  let flagId

  test.beforeAll(async () => {
    const flag = await createFlag('f1-layout-' + Date.now())
    flagId = flag.id
    // Save notes via API so markdown-body renders on load
    await fetch(`${API}/flags/${flag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: flag.description,
        key: flag.key || '',
        notes: '# Hello\n\nThis is a **test note** with enough content to show the layout bug.\n\n- Item 1\n- Item 2\n- Item 3',
      }),
    })
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
    await page.waitForTimeout(500)
  })

  test('F1a+F1b: Markdown editor should take full width', async ({ page }) => {
    // The markdown-body is rendered because we saved notes via API
    const markdownBody = page.locator('.markdown-body').first()
    await expect(markdownBody).toBeVisible({ timeout: 5000 })

    // Screenshot the notes area in its current (broken) state
    const flagConfig = page.locator('.flag-config-card')
    await flagConfig.screenshot({ path: 'e2e/screenshots/f1-notes-layout-AFTER.png' })

    // Get widths: the markdown-body should be close to the card body width
    const widths = await page.evaluate(() => {
      const cardBody = document.querySelector('.flag-config-card .el-card__body .el-card__body')
        || document.querySelector('.flag-config-card .el-card .el-card__body')
      const mdBody = document.querySelector('.markdown-body')
      const editorContainer = document.querySelector('.markdown-editor')
      return {
        cardBodyWidth: cardBody ? cardBody.offsetWidth : 0,
        mdBodyWidth: mdBody ? mdBody.offsetWidth : 0,
        editorWidth: editorContainer ? editorContainer.offsetWidth : 0,
        // Check parent el-row display style
        editorParentDisplay: editorContainer
          ? window.getComputedStyle(editorContainer.parentElement).display
          : 'unknown',
      }
    })

    console.log('F1 layout widths:', JSON.stringify(widths, null, 2))

    // The .markdown-editor (MarkdownEditor) parent is an <el-row> with display:flex.
    // This causes .markdown-editor to shrink instead of taking full width.
    // After fix (el-row → div), parent will be display:block.
    //
    // BUG ASSERTION: editor should take >= 90% of available space
    // Currently fails because flex shrinks it.
    const ratio = widths.editorWidth / widths.cardBodyWidth
    console.log(`F1: editor/card width ratio = ${ratio.toFixed(3)}`)
    expect(ratio, 'Markdown editor should take nearly full width of the card').toBeGreaterThan(0.9)
  })

  test('F1c+F1d: Tags section should take full width', async ({ page }) => {
    // The tags section heading and tags container are inside el-row without el-col
    const tagsHeading = page.locator('h5').filter({ hasText: 'Tags' })
    await expect(tagsHeading).toBeVisible()

    // Screenshot the tags area
    const tagsArea = page.locator('.tags-container-inner').first()
    await tagsArea.screenshot({ path: 'e2e/screenshots/f1-tags-layout-BEFORE.png' })

    // Check that the tags container parent (el-row) isn't shrinking content
    const widths = await page.evaluate(() => {
      const tagsInner = document.querySelector('.tags-container-inner')
      if (!tagsInner) return { tagsInnerWidth: 0, parentWidth: 0 }
      const parent = tagsInner.parentElement // this is the el-row
      const grandparent = parent ? parent.parentElement : null // card body
      return {
        tagsInnerWidth: tagsInner.offsetWidth,
        parentWidth: parent ? parent.offsetWidth : 0,
        parentDisplay: parent ? window.getComputedStyle(parent).display : 'unknown',
        grandparentWidth: grandparent ? grandparent.offsetWidth : 0,
      }
    })

    console.log('F1d tags widths:', JSON.stringify(widths, null, 2))

    // parent is el-row (display:flex), grandparent is el-card__body
    // After fix: parent will be div (display:block)
    const ratio = widths.parentWidth / widths.grandparentWidth
    console.log(`F1d: tags-parent/grandparent width ratio = ${ratio.toFixed(3)}`)
    expect(ratio, 'Tags container should take full width').toBeGreaterThan(0.9)
  })
})


// ─── F2: el-checkbox :checked → :model-value ────────────────────
// Element Plus ignores :checked prop. Checkboxes show unchecked even
// when data says they're selected.

test.describe('F2: el-checkbox :checked bug', () => {
  let flagId, segmentId

  test.beforeAll(async () => {
    const flag = await createFlag('f2-checkbox-' + Date.now())
    flagId = flag.id
    const v1 = await createVariant(flagId, 'control')
    const v2 = await createVariant(flagId, 'treatment')
    const segment = await createSegment(flagId, 'f2-segment')
    segmentId = segment.id

    // Set distribution 50/50 via API
    await fetch(`${API}/flags/${flagId}/segments/${segmentId}/distributions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        distributions: [
          { variantID: v1.id, variantKey: 'control', percent: 50 },
          { variantID: v2.id, variantKey: 'treatment', percent: 50 },
        ],
      }),
    })
  })

  test('Checkboxes should be checked when reopening distribution dialog', async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
    await page.waitForTimeout(500)

    // Open edit distribution dialog
    const editBtn = page.locator('.segment-distributions button').filter({ hasText: 'edit' }).first()
    await editBtn.click()
    await page.waitForTimeout(500)

    const dialog = page.locator('.el-dialog').filter({ hasText: 'Edit distribution' })
    await expect(dialog).toBeVisible()

    // Check that checkboxes are visually checked
    // Element Plus uses .is-checked class on the checkbox wrapper when checked
    const checkboxes = dialog.locator('.el-checkbox')
    const count = await checkboxes.count()
    console.log(`F2: Found ${count} checkboxes in distribution dialog`)

    expect(count, 'Should have checkboxes for variants').toBeGreaterThanOrEqual(2)

    // Both checkboxes should be checked because we set 50/50 distribution
    const checkedCheckboxes = dialog.locator('.el-checkbox.is-checked')
    const checkedCount = await checkedCheckboxes.count()
    console.log(`F2: ${checkedCount} out of ${count} checkboxes are visually checked`)

    expect(checkedCount, 'All variant checkboxes should be visually checked (distribution is set)').toBe(count)

    // Close and reopen to verify reactivity (not just initial render)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await editBtn.click()
    await page.waitForTimeout(500)
    await expect(dialog).toBeVisible()

    const checkedAfterReopen = dialog.locator('.el-checkbox.is-checked')
    const checkedCountAfterReopen = await checkedAfterReopen.count()
    console.log(`F2: After reopen: ${checkedCountAfterReopen} out of ${count} checkboxes are checked`)
    expect(checkedCountAfterReopen, 'Checkboxes should stay checked after dialog reopen').toBe(count)
  })
})


// ─── F3: el-slider :value → :model-value ────────────────────────
// Element Plus ignores :value on el-slider.

test.describe('F3: el-slider :value bug', () => {
  let flagId

  test.beforeAll(async () => {
    const flag = await createFlag('f3-slider-' + Date.now())
    flagId = flag.id
    await createVariant(flagId, 'v1')
    await createSegment(flagId, 'f3-segment')
  })

  test('Disabled slider should show value 0', async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
    await page.waitForTimeout(500)

    // Open edit distribution dialog
    const editBtn = page.locator('.segment-distributions button').filter({ hasText: 'edit' }).first()
    await editBtn.click()
    await page.waitForTimeout(500)

    const dialog = page.locator('.el-dialog').filter({ hasText: 'Edit distribution' })
    await expect(dialog).toBeVisible()

    // Screenshot showing slider state
    await dialog.screenshot({ path: 'e2e/screenshots/f3-slider-BEFORE.png' })

    // The disabled slider's input should show 0
    // :value="0" is ignored by Element Plus — it uses :model-value
    const sliderInput = dialog.locator('.el-slider .el-input-number input').first()
    if (await sliderInput.count() > 0) {
      const value = await sliderInput.inputValue()
      console.log(`F3: Disabled slider input value = "${value}"`)
      expect(value, 'Disabled slider should display 0').toBe('0')
    }

    await page.keyboard.press('Escape')
  })
})


// ─── F4: type="flex" removed ─────────────────────────────────────
// Element Plus removed the type prop from el-row (it's always flex).
// type="flex" was cleaned up from Flag.vue. No test needed because
// Vue 3 silently passes unknown props as fallthrough attributes
// without emitting warnings.
